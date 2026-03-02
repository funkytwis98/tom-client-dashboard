'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createNewClient } from '@/app/actions/clients'

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

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NewClientForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    slug: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    timezone: 'America/New_York',
    subscription_tier: 'standard' as 'standard' | 'premium' | 'enterprise',
    phone_number: '',
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isPending, startTransition] = useTransition()

  function addToast(message: string, type: Toast['type']) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setForm((f) => ({
      ...f,
      name,
      slug: slugManuallyEdited ? f.slug : slugify(name),
    }))
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setForm((f) => ({ ...f, slug: e.target.value }))
  }

  function field(key: Exclude<keyof typeof form, 'name' | 'slug'>) {
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
        await createNewClient({
          name: form.name,
          slug: form.slug,
          owner_name: form.owner_name,
          owner_phone: form.owner_phone,
          owner_email: form.owner_email || undefined,
          timezone: form.timezone,
          subscription_tier: form.subscription_tier,
          phone_number: form.phone_number || undefined,
        })
        addToast('Client created!', 'success')
        router.push('/clients')
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to create client.', 'error')
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
                value={form.name}
                onChange={handleNameChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., interstate-tires"
                className={inputCls}
                value={form.slug}
                onChange={handleSlugChange}
              />
              <p className="mt-1 text-xs text-gray-400">
                URL-friendly identifier, auto-generated from name
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
                Retell AI phone number (can be added later)
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
          <div className="max-w-xs">
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
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Client'}
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
