'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/client'
import { TIERS, type SubscriptionTier } from '@/lib/stripe/products'
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

const VALID_TIERS = ['website', 'receptionist', 'social', 'complete', 'the_works'] as const

const CreateCheckoutSchema = z.object({
  clientId: z.string().uuid(),
  tier: z.enum(VALID_TIERS),
})

/**
 * Creates a Stripe Checkout Session for a new subscription.
 * For tiers with one-time fees (website, the_works), adds both one-time and recurring line items.
 */
export async function createCheckoutSession(clientId: string, tier: Exclude<SubscriptionTier, 'free'>) {
  CreateCheckoutSchema.parse({ clientId, tier })
  const { supabase, org } = await getAuthenticatedOrg()
  const client = await getOwnedClient(supabase, org.id, clientId)

  if (!client.stripe_customer_id) {
    throw new Error('Client does not have a Stripe customer. Create one first.')
  }

  const tierConfig = TIERS[tier]
  const stripe = getStripeClient()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')

  // Build line items
  const lineItems: { price: string; quantity: number }[] = [
    { price: tierConfig.stripeRecurringPriceId(), quantity: 1 },
  ]

  // Add one-time setup fee if applicable
  const oneTimePriceId = tierConfig.stripeOneTimePriceId()
  if (oneTimePriceId) {
    lineItems.push({ price: oneTimePriceId, quantity: 1 })
  }

  const session = await stripe.checkout.sessions.create({
    customer: client.stripe_customer_id,
    mode: 'subscription',
    line_items: lineItems,
    success_url: `${appUrl}/clients/${clientId}/billing?checkout=success`,
    cancel_url: `${appUrl}/clients/${clientId}/billing?checkout=cancelled`,
    metadata: {
      client_id: clientId,
      tier,
    },
  })

  return { success: true, checkoutUrl: session.url }
}

const UpdateTierSchema = z.object({
  clientId: z.string().uuid(),
  newTier: z.enum(VALID_TIERS),
})

/**
 * Changes the subscription tier by swapping the price item on the existing Stripe subscription.
 */
export async function updateSubscriptionTier(clientId: string, newTier: Exclude<SubscriptionTier, 'free'>) {
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
        price: tierConfig.stripeRecurringPriceId(),
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')

  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripe_customer_id,
    return_url: `${appUrl}/clients/${clientId}/billing`,
  })

  return { success: true, url: session.url }
}
