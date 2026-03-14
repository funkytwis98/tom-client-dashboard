import { env } from '@/lib/utils/env'
import { getStripeClient } from '@/lib/stripe/client'
import { getTierByPriceId } from '@/lib/stripe/products'
import { createServiceClient } from '@/lib/supabase/service'
import { reportError } from '@/lib/monitoring/report-error'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'
import type Stripe from 'stripe'

// ---------------------------------------------------------------------------
// POST /api/webhooks/stripe
// Receives Stripe webhook events and keeps the DB in sync.
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  // Rate limit: 30 requests per minute per IP
  const rl = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl)

  // 1. Read raw body (required for signature verification)
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // 2. Verify webhook signature
  const stripe = getStripeClient()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret())
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // 3. Idempotency check
  const { data: existing } = await supabase
    .from('stripe_webhook_log')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    return Response.json({ received: true, duplicate: true }, { status: 200 })
  }

  // 4. Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, supabase)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break
      default:
        // Unknown event type — log and ignore
        console.log('[stripe-webhook] Unhandled event type:', event.type)
    }
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err)
    reportError({
      type: 'stripe_webhook',
      message: String(err),
      context: { event_type: event.type, event_id: event.id },
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  // 5. Record successful processing
  await supabase.from('stripe_webhook_log').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processed_at: new Date().toISOString(),
  })

  return Response.json({ received: true }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

type ServiceClient = ReturnType<typeof createServiceClient>

async function findClientByStripeCustomer(customerId: string, supabase: ServiceClient) {
  const { data: client } = await supabase
    .from('clients')
    .select('id, subscription_tier, subscription_status')
    .eq('stripe_customer_id', customerId)
    .single()

  return client
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: ServiceClient) {
  const clientId = session.metadata?.client_id
  const tier = session.metadata?.tier

  if (!clientId || !tier) {
    console.warn('[stripe-webhook] Checkout session missing client_id or tier metadata')
    return
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  await supabase
    .from('clients')
    .update({
      stripe_subscription_id: subscriptionId ?? null,
      subscription_tier: tier,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, supabase: ServiceClient) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const client = await findClientByStripeCustomer(customerId, supabase)
  if (!client) {
    console.warn('[stripe-webhook] No client found for Stripe customer:', customerId)
    return
  }

  // Determine tier from price ID
  const priceId = subscription.items.data[0]?.price?.id
  const tier = priceId ? getTierByPriceId(priceId) : null

  await supabase
    .from('clients')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: 'active',
      ...(tier ? { subscription_tier: tier } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', client.id)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: ServiceClient) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const client = await findClientByStripeCustomer(customerId, supabase)
  if (!client) {
    console.warn('[stripe-webhook] No client found for Stripe customer:', customerId)
    return
  }

  // Sync tier from current price
  const priceId = subscription.items.data[0]?.price?.id
  const tier = priceId ? getTierByPriceId(priceId) : null

  // Map Stripe status to our status
  let status: 'active' | 'paused' | 'cancelled' | 'past_due' = 'active'
  if (subscription.cancel_at_period_end) {
    status = 'cancelled'
  } else if (subscription.status === 'past_due') {
    status = 'past_due'
  } else if (subscription.status === 'unpaid') {
    status = 'paused'
  } else if (subscription.status === 'canceled') {
    status = 'cancelled'
  }

  await supabase
    .from('clients')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      ...(tier ? { subscription_tier: tier } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', client.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: ServiceClient) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const client = await findClientByStripeCustomer(customerId, supabase)
  if (!client) {
    console.warn('[stripe-webhook] No client found for Stripe customer:', customerId)
    return
  }

  await supabase
    .from('clients')
    .update({
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', client.id)
}

async function handleInvoicePaid(invoice: Stripe.Invoice, supabase: ServiceClient) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const client = await findClientByStripeCustomer(customerId, supabase)
  if (!client) return

  // Reactivate after successful payment
  if (client.subscription_status === 'paused' || client.subscription_status === 'past_due') {
    await supabase
      .from('clients')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: ServiceClient) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const client = await findClientByStripeCustomer(customerId, supabase)
  if (!client) return

  await supabase
    .from('clients')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', client.id)

  // Create alert visible in Command Center
  reportError({
    type: 'stripe_webhook',
    message: `Payment failed for client ${client.id}`,
    clientId: client.id,
    context: {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  })
}
