import Stripe from 'stripe'
import { env } from '@/lib/utils/env'

// Singleton Stripe client — created once, reused across requests in the same process
let _stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!_stripeClient) {
    _stripeClient = new Stripe(env.stripeSecretKey(), {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return _stripeClient
}
