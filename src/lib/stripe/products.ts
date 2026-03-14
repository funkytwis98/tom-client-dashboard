import { env } from '@/lib/utils/env'

export type SubscriptionTier = 'website' | 'receptionist' | 'social' | 'complete' | 'the_works' | 'free'

export interface TierConfig {
  name: string
  tier: SubscriptionTier
  monthlyPrice: number // monthly recurring price in dollars
  oneTimePrice: number // one-time setup fee in dollars (0 if none)
  stripeRecurringPriceId: () => string
  stripeOneTimePriceId: () => string | null
  features: string[]
  products: ('website' | 'receptionist' | 'social')[]
}

export const TIERS: Record<Exclude<SubscriptionTier, 'free'>, TierConfig> = {
  website: {
    name: 'Website',
    tier: 'website',
    monthlyPrice: 19,
    oneTimePrice: 499,
    stripeRecurringPriceId: () => env.stripePriceWebsiteMonthly(),
    stripeOneTimePriceId: () => env.stripePriceWebsiteSetup(),
    features: [
      'Custom-built website',
      'Hosting & maintenance',
      'Analytics dashboard',
      'Monthly updates',
    ],
    products: ['website'],
  },
  receptionist: {
    name: 'Tom Receptionist',
    tier: 'receptionist',
    monthlyPrice: 99,
    oneTimePrice: 0,
    stripeRecurringPriceId: () => env.stripePriceReceptionist(),
    stripeOneTimePriceId: () => null,
    features: [
      'AI phone receptionist',
      'Owner SMS notifications',
      'Lead capture & CRM',
      'Dashboard & analytics',
    ],
    products: ['receptionist'],
  },
  social: {
    name: 'Tom Social',
    tier: 'social',
    monthlyPrice: 99,
    oneTimePrice: 0,
    stripeRecurringPriceId: () => env.stripePriceSocial(),
    stripeOneTimePriceId: () => null,
    features: [
      'AI social media manager',
      'Auto-generated posts',
      'Multi-platform publishing',
      'Engagement tracking',
    ],
    products: ['social'],
  },
  complete: {
    name: 'Tom Complete',
    tier: 'complete',
    monthlyPrice: 149,
    oneTimePrice: 0,
    stripeRecurringPriceId: () => env.stripePriceComplete(),
    stripeOneTimePriceId: () => null,
    features: [
      'AI phone receptionist',
      'AI social media manager',
      'Bundled discount ($49/mo savings)',
      'Full dashboard access',
    ],
    products: ['receptionist', 'social'],
  },
  the_works: {
    name: 'The Works',
    tier: 'the_works',
    monthlyPrice: 149,
    oneTimePrice: 499,
    stripeRecurringPriceId: () => env.stripePriceTheWorksMonthly(),
    stripeOneTimePriceId: () => env.stripePriceTheWorksSetup(),
    features: [
      'Custom-built website',
      'AI phone receptionist',
      'AI social media manager',
      'Everything included',
    ],
    products: ['website', 'receptionist', 'social'],
  },
}

/**
 * Look up the subscription tier by Stripe recurring price ID.
 * Returns null if the price ID doesn't match any configured tier.
 */
export function getTierByPriceId(priceId: string): SubscriptionTier | null {
  for (const tier of Object.values(TIERS)) {
    try {
      if (tier.stripeRecurringPriceId() === priceId) return tier.tier
    } catch {
      // env var not set — skip
    }
  }
  return null
}

/**
 * Get the display price string for a tier.
 */
export function getTierPriceDisplay(tier: SubscriptionTier): string {
  if (tier === 'free') return 'Free'
  const config = TIERS[tier]
  if (!config) return '—'
  if (config.oneTimePrice > 0) {
    return `$${config.oneTimePrice} + $${config.monthlyPrice}/mo`
  }
  return `$${config.monthlyPrice}/mo`
}
