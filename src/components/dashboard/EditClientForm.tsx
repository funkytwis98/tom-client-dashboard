'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClient } from '@/app/actions/clients'
import type { Client } from '@/types/domain'

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
]

const TIER_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
] as const

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

export function EditClientForm({ client }: { client: Client }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: client.name,
    owner_name: client.owner_name ?? '',
    owner_phone: client.owner_phone ?? '',
    owner_email: client.owner_email ?? '',
    timezone: client.timezone,
    subscription_tier: client.subscription_tier,
    subscription_status: client.subscription_status,
    phone_number: client.phone_number ?? '',
    retell_agent_id: client.retell_agent_id ?? '',
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isPending, startTransition] = useTransition()

  function addToast(message: string, type: Toast['type']) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      ) => setForm((f) => ({ ...f, [key]: e.target.value })),
    }
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateClient({
          id: client.id,
          name: form.name,
          owner_name: form.owner_name,
          owner_phone: form.owner_phone,
          owner_email: form.owner_email || undefined,
          timezone: form.timezone,
          subscription_tier: form.subscription_tier,
          subscription_status: form.subscription_status,
          phone_number: form.phone_number || undefined,
          retell_agent_id: form.retell_agent_id || undefined,
        })
        addToast('Client updated!', 'success')
        router.refresh()
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to update client.', 'error')
      }
    })
  }

  return (
    <div className="relative">
      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Info */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Business Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Interstate Tires"
                className={inputCls}
                {...field('name')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                disabled
                className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
                value={client.slug}
              />
              <p className="mt-1 text-xs text-gray-400">
                Cannot be changed after creation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g., +14235551234"
                className={inputCls}
                {...field('phone_number')}
              />
              <p className="mt-1 text-xs text-gray-400">
                Retell AI phone number
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retell Agent ID
              </label>
              <input
                type="text"
                placeholder="e.g., agent_abc123"
                className={inputCls}
                {...field('retell_agent_id')}
              />
              <p className="mt-1 text-xs text-gray-400">
                Retell AI agent identifier
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select className={inputCls} {...field('timezone')}>
                {TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Owner Info */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Owner Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., John Smith"
                className={inputCls}
                {...field('owner_name')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g., +14235559999"
                className={inputCls}
                {...field('owner_phone')}
              />
              <p className="mt-1 text-xs text-gray-400">
                For SMS notifications
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Email
              </label>
              <input
                type="email"
                placeholder="e.g., john@example.com"
                className={inputCls}
                {...field('owner_email')}
              />
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Subscription
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tier
              </label>
              <select className={inputCls} {...field('subscription_tier')}>
                {TIER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select className={inputCls} {...field('subscription_status')}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/clients')}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
