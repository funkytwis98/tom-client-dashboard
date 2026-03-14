'use client'

import { useTransition, useState } from 'react'
import {
  createStripeCustomer,
  createCheckoutSession,
  updateSubscriptionTier,
  cancelSubscription,
  getStripePortalUrl,
} from '@/app/actions/billing'
import { TIERS, getTierPriceDisplay, type SubscriptionTier } from '@/lib/stripe/products'

interface Props {
  clientId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentTier: SubscriptionTier
  subscriptionStatus: string
}

type PaidTier = Exclude<SubscriptionTier, 'free'>

const TIER_OPTIONS: { value: PaidTier; label: string; price: string }[] = Object.values(TIERS).map((t) => ({
  value: t.tier as PaidTier,
  label: t.name,
  price: getTierPriceDisplay(t.tier),
}))

export function ClientBillingActions({
  clientId,
  stripeCustomerId,
  stripeSubscriptionId,
  currentTier,
  subscriptionStatus,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedTier, setSelectedTier] = useState<PaidTier>(currentTier === 'free' ? 'receptionist' : currentTier as PaidTier)
  const [showChangeTier, setShowChangeTier] = useState(false)

  function handleAction(action: () => Promise<unknown>, successMsg: string) {
    setMessage(null)
    startTransition(async () => {
      try {
        await action()
        setMessage({ type: 'success', text: successMsg })
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Feedback message */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

        <div className="flex flex-wrap gap-3">
          {/* Step 1: Create Stripe Customer */}
          {!stripeCustomerId && (
            <button
              onClick={() => handleAction(
                () => createStripeCustomer(clientId),
                'Stripe customer created successfully.'
              )}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Creating...' : 'Create Stripe Customer'}
            </button>
          )}

          {/* Step 2: Create Subscription via Stripe Checkout */}
          {stripeCustomerId && !stripeSubscriptionId && (
            <div className="flex items-center gap-2">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as PaidTier)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — {t.price}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setMessage(null)
                  startTransition(async () => {
                    try {
                      const result = await createCheckoutSession(clientId, selectedTier)
                      if (result.checkoutUrl) {
                        window.open(result.checkoutUrl, '_blank')
                        setMessage({ type: 'success', text: 'Stripe Checkout opened in new tab.' })
                      }
                    } catch (err) {
                      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create checkout' })
                    }
                  })
                }}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Creating...' : 'Start Checkout'}
              </button>
            </div>
          )}

          {/* Active subscription actions */}
          {stripeSubscriptionId && subscriptionStatus !== 'cancelled' && (
            <>
              {/* Change Tier */}
              {!showChangeTier ? (
                <button
                  onClick={() => setShowChangeTier(true)}
                  disabled={isPending}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Change Tier
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as PaidTier)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {TIER_OPTIONS.filter((t) => t.value !== currentTier).map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} — {t.price}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      handleAction(
                        () => updateSubscriptionTier(clientId, selectedTier),
                        `Tier changed to ${selectedTier} successfully.`
                      )
                      setShowChangeTier(false)
                    }}
                    disabled={isPending}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? 'Updating...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowChangeTier(false)}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Cancel */}
              <button
                onClick={() => {
                  if (confirm('Cancel subscription at end of billing period?')) {
                    handleAction(
                      () => cancelSubscription(clientId),
                      'Subscription will be cancelled at end of billing period.'
                    )
                  }
                }}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </>
          )}

          {/* Stripe Portal & Dashboard Links */}
          {stripeCustomerId && (
            <>
              <button
                onClick={() => {
                  startTransition(async () => {
                    try {
                      const result = await getStripePortalUrl(clientId)
                      window.open(result.url, '_blank')
                    } catch (err) {
                      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to open portal' })
                    }
                  })
                }}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Manage Billing
              </button>

              <a
                href={`https://dashboard.stripe.com/customers/${stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                View in Stripe
                <svg className="ml-1.5 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
