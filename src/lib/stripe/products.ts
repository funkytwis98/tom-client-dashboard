import { env } from '@/lib/utils/env'

export interface TierConfig {
  name: string
  tier: 'standard' | 'premium' | 'enterprise'
  price: number // monthly price in dollars
  stripePriceId: () => string
  features: string[]
}

export const TIERS: Record<'standard' | 'premium' | 'enterprise', TierConfig> = {
  standard: {
    name: 'Starter',
    tier: 'standard',
    price: 299,
    stripePriceId: () => env.stripePriceStandard(),
    features: [
      'Inbound call answering',
      '500 minutes/month',
      'Owner SMS notifications',
      'Dashboard & analytics',
    ],
  },
  premium: {
    name: 'Professional',
    tier: 'premium',
    price: 499,
    stripePriceId: () => env.stripePricePremium(),
    features: [
      'Everything in Starter',
      'Outbound follow-ups',
      '1,000 minutes/month',
      'Sales playbook',
      'CRM access',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'enterprise',
    price: 799,
    stripePriceId: () => env.stripePriceEnterprise(),
    features: [
      'Everything in Professional',
      'Custom integrations',
      'Unlimited minutes',
      'Priority support',
    ],
  },
}

/**
 * Look up the subscription tier by Stripe price ID.
 * Returns null if the price ID doesn't match any configured tier.
 */
export function getTierByPriceId(priceId: string): 'standard' | 'premium' | 'enterprise' | null {
  for (const tier of Object.values(TIERS)) {
    try {
      if (tier.stripePriceId() === priceId) return tier.tier
    } catch {
      // env var not set — skip
    }
  }
  return null
}
