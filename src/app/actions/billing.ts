'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/client'
import { TIERS } from '@/lib/stripe/products'
import { z } from 'zod'

// --- Helpers ---

async function getAuthenticatedOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (error || !org) throw new Error('Organization not found')
  return { supabase, org }
}

async function getOwnedClient(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, clientId: string) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('org_id', orgId)
    .single()

  if (error || !client) throw new Error('Client not found')
  return client
}

// --- Actions ---

const ClientIdSchema = z.object({
  clientId: z.string().uuid(),
})

/**
 * Creates a Stripe customer for a client. Idempotent — returns existing if already set.
 */
export async function createStripeCustomer(clientId: string) {
  ClientIdSchema.parse({ clientId })
  const { supabase, org } = await getAuthenticatedOrg()
  const client = await getOwnedClient(supabase, org.id, clientId)

  // Idempotent: if already has a Stripe customer, return it
  if (client.stripe_customer_id) {
    return { success: true, stripeCustomerId: client.stripe_customer_id }
  }

  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    name: client.name,
    email: client.owner_email || undefined,
    phone: client.owner_phone || undefined,
    metadata: {
      client_id: clientId,
      org_id: org.id,
    },
  })

  const { error } = await supabase
    .from('clients')
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/billing`)
  revalidatePath('/billing')
  return { success: true, stripeCustomerId: customer.id }
}

const CreateSubscriptionSchema = z.object({
  clientId: z.string().uuid(),
  tier: z.enum(['standard', 'premium', 'enterprise']),
})

/**
 * Creates a Stripe subscription for a client (invoice-based, not card-on-file).
 */
export async function createSubscription(clientId: string, tier: 'standard' | 'premium' | 'enterprise') {
  CreateSubscriptionSchema.parse({ clientId, tier })
  const { supabase, org } = await getAuthenticatedOrg()
  const client = await getOwnedClient(supabase, org.id, clientId)

  if (!client.stripe_customer_id) {
    throw new Error('Client does not have a Stripe customer. Create one first.')
  }

  if (client.stripe_subscription_id) {
    throw new Error('Client already has an active subscription. Update the tier instead.')
  }

  const tierConfig = TIERS[tier]
  const stripe = getStripeClient()

  const subscription = await stripe.subscriptions.create({
    customer: client.stripe_customer_id,
    items: [{ price: tierConfig.stripePriceId() }],
    collection_method: 'send_invoice',
    days_until_due: 30,
    metadata: {
      client_id: clientId,
    },
  })

  const { error } = await supabase
    .from('clients')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_tier: tier,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/billing`)
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/billing')
  return { success: true, subscriptionId: subscription.id }
}

const UpdateTierSchema = z.object({
  clientId: z.string().uuid(),
  newTier: z.enum(['standard', 'premium', 'enterprise']),
})

/**
 * Changes the subscription tier by swapping the price item on the existing Stripe subscription.
 */
export async function updateSubscriptionTier(clientId: string, newTier: 'standard' | 'premium' | 'enterprise') {
  UpdateTierSchema.parse({ clientId, newTier })
  const { supabase, org } = await getAuthenticatedOrg()
  const client = await getOwnedClient(supabase, org.id, clientId)

  if (!client.stripe_subscription_id) {
    throw new Error('Client does not have an active subscription.')
  }

  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(client.stripe_subscription_id)
  const currentItem = subscription.items.data[0]

  if (!currentItem) {
    throw new Error('Subscription has no items.')
  }

  const tierConfig = TIERS[newTier]

  await stripe.subscriptions.update(client.stripe_subscription_id, {
    items: [
      {
        id: currentItem.id,
        price: tierConfig.stripePriceId(),
      },
    ],
  })

  const { error } = await supabase
    .from('clients')
    .update({
      subscription_tier: newTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/billing`)
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/billing')
  return { success: true }
}

/**
 * Cancels a subscription at the end of the current billing period.
 */
export async function cancelSubscription(clientId: string) {
  ClientIdSchema.parse({ clientId })
  const { supabase, org } = await getAuthenticatedOrg()
  const client = await getOwnedClient(supabase, org.id, clientId)

  if (!client.stripe_subscription_id) {
    throw new Error('Client does not have an active subscription.')
  }

  const stripe = getStripeClient()
  await stripe.subscriptions.update(client.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  const { error } = await supabase
    .from('clients')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/billing`)
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/billing')
  return { success: true }
}

/**
 * Creates a Stripe billing portal session URL for the agency admin.
 */
export async function getStripePortalUrl(clientId: string) {
  ClientIdSchema.parse({ clientId })
  const { supabase, org } = await getAuthenticatedOrg()
  const client = await getOwnedClient(supabase, org.id, clientId)

  if (!client.stripe_customer_id) {
    throw new Error('Client does not have a Stripe customer.')
  }

  const stripe = getStripeClient()
  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ai-receptionist-snowy.vercel.app'}/clients/${clientId}/billing`,
  })

  return { success: true, url: session.url }
}

/**
 * Creates and sends a one-off invoice for the current subscription.
 */
export async function sendInvoice(clientId: string) {
  ClientIdSchema.parse({ clientId })
  const { supabase, org } = await getAuthenticatedOrg()
  const client = await getOwnedClient(supabase, org.id, clientId)

  if (!client.stripe_customer_id) {
    throw new Error('Client does not have a Stripe customer.')
  }

  if (!client.stripe_subscription_id) {
    throw new Error('Client does not have an active subscription.')
  }

  const stripe = getStripeClient()

  // Create an invoice for the subscription's pending items and send it
  const invoice = await stripe.invoices.create({
    customer: client.stripe_customer_id,
    subscription: client.stripe_subscription_id,
    collection_method: 'send_invoice',
    days_until_due: 30,
  })

  await stripe.invoices.sendInvoice(invoice.id)

  revalidatePath(`/clients/${clientId}/billing`)
  return { success: true, invoiceId: invoice.id }
}
