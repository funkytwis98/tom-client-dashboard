'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { onboardClient, type OnboardInput } from '@/app/actions/clients'

const STEPS = ['Business Details', 'AI Receptionist', 'Knowledge Base', 'Review & Launch'] as const

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
]

const TIER_OPTIONS = [
  { value: 'standard', label: 'Standard — $299/mo' },
  { value: 'premium', label: 'Premium — $499/mo' },
  { value: 'enterprise', label: 'Enterprise — $799/mo' },
] as const

const VOICE_OPTIONS = [
  { value: '11labs-Adrian', label: 'Adrian (Male, American)' },
  { value: '11labs-Myra', label: 'Myra (Female, American)' },
  { value: '11labs-Paola', label: 'Paola (Female, American)' },
  { value: '11labs-Marissa', label: 'Marissa (Female, American)' },
  { value: '11labs-Nathan', label: 'Nathan (Male, American)' },
  { value: '11labs-Ryan', label: 'Ryan (Male, American)' },
  { value: '11labs-Sarah', label: 'Sarah (Female, American)' },
  { value: '11labs-Laura', label: 'Laura (Female, American)' },
]

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

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

const textareaCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]'

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    // Step 1
    name: '',
    slug: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    timezone: 'America/New_York',
    subscription_tier: 'standard' as 'standard' | 'premium' | 'enterprise',
    // Step 2
    agent_name: '',
    voice_id: '11labs-Sarah',
    greeting: '',
    personality: '',
    sales_style: '',
    escalation_rules: '',
    // Step 3
    kb_services: '',
    kb_hours: '',
    kb_faq: '',
    // Step 4
    area_code: '',
  })

  function addToast(message: string, type: Toast['type']) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugManuallyEdited ? f.slug : slugify(value),
      agent_name: f.agent_name || '', // keep existing if set
    }))
  }

  function validateStep(s: number): string | null {
    switch (s) {
      case 0:
        if (!form.name.trim()) return 'Business name is required'
        if (!form.slug.trim()) return 'Slug is required'
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return 'Slug must be lowercase letters, numbers, and hyphens'
        if (!form.owner_name.trim()) return 'Owner name is required'
        if (!form.owner_phone.trim()) return 'Owner phone is required'
        return null
      case 1:
        if (!form.voice_id) return 'Please select a voice'
        return null
      case 2:
        return null // all optional
      case 3:
        if (form.area_code && !/^\d{3}$/.test(form.area_code)) return 'Area code must be 3 digits'
        return null
      default:
        return null
    }
  }

  function goNext() {
    const err = validateStep(step)
    if (err) {
      addToast(err, 'error')
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function handleLaunch() {
    const err = validateStep(step)
    if (err) {
      addToast(err, 'error')
      return
    }

    startTransition(async () => {
      try {
        const input: OnboardInput = {
          name: form.name,
          slug: form.slug,
          owner_name: form.owner_name,
          owner_phone: form.owner_phone,
          owner_email: form.owner_email || undefined,
          timezone: form.timezone,
          subscription_tier: form.subscription_tier,
          agent_name: form.agent_name || 'receptionist',
          voice_id: form.voice_id,
          greeting: form.greeting || undefined,
          personality: form.personality || undefined,
          sales_style: form.sales_style || undefined,
          escalation_rules: form.escalation_rules || undefined,
          kb_services: form.kb_services || undefined,
          kb_hours: form.kb_hours || undefined,
          kb_faq: form.kb_faq || undefined,
          area_code: form.area_code || undefined,
        }
        const result = await onboardClient(input)
        if (result.success) {
          addToast('Client launched successfully!', 'success')
          router.push(`/clients/${result.clientId}`)
        } else {
          addToast(result.error, 'error')
          if (result.clientId) {
            // Client was created but Retell failed — redirect so they can retry
            setTimeout(() => router.push(`/clients/${result.clientId}`), 2000)
          }
        }
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Something went wrong', 'error')
      }
    })
  }

  return (
    <div className="relative">
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i < step
                    ? 'bg-indigo-600 text-white'
                    : i === step
                      ? 'border-2 border-indigo-600 text-indigo-600'
                      : 'border-2 border-gray-300 text-gray-400'
                }`}
              >
                {i < step ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  i <= step ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-8 sm:w-16 ${i < step ? 'bg-indigo-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Business Details */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
            <p className="text-sm text-gray-500 mt-1">Basic information about the client business</p>
          </div>

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
                onChange={(e) => handleNameChange(e.target.value)}
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
                onChange={(e) => {
                  setSlugManuallyEdited(true)
                  set('slug', e.target.value)
                }}
              />
              <p className="mt-1 text-xs text-gray-400">Auto-generated from name</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., John Smith"
                className={inputCls}
                value={form.owner_name}
                onChange={(e) => set('owner_name', e.target.value)}
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
                value={form.owner_phone}
                onChange={(e) => set('owner_phone', e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">For SMS notifications</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
              <input
                type="email"
                placeholder="e.g., john@example.com"
                className={inputCls}
                value={form.owner_email}
                onChange={(e) => set('owner_email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                className={inputCls}
                value={form.timezone}
                onChange={(e) => set('timezone', e.target.value)}
              >
                {TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
              <select
                className={inputCls}
                value={form.subscription_tier}
                onChange={(e) => set('subscription_tier', e.target.value as typeof form.subscription_tier)}
              >
                {TIER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: AI Receptionist */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Receptionist</h2>
            <p className="text-sm text-gray-500 mt-1">Configure the AI agent personality and voice</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
              <input
                type="text"
                placeholder="e.g., Sarah"
                className={inputCls}
                value={form.agent_name}
                onChange={(e) => set('agent_name', e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">What the AI calls itself (default: &quot;receptionist&quot;)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={form.voice_id}
                onChange={(e) => set('voice_id', e.target.value)}
              >
                {VOICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Greeting</label>
            <input
              type="text"
              placeholder={`e.g., Thanks for calling ${form.name || 'our business'}, this is ${form.agent_name || 'your receptionist'}, how can I help you?`}
              className={inputCls}
              value={form.greeting}
              onChange={(e) => set('greeting', e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">How the AI answers the phone. Leave blank for a default.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personality</label>
            <textarea
              placeholder="e.g., friendly, professional, knowledgeable about tires, Southern charm"
              className={textareaCls}
              value={form.personality}
              onChange={(e) => set('personality', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Style</label>
            <textarea
              placeholder="e.g., consultative, not pushy, asks good questions to understand the customer's needs"
              className={textareaCls}
              value={form.sales_style}
              onChange={(e) => set('sales_style', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Rules</label>
            <textarea
              placeholder="e.g., Transfer to owner if caller is angry, asks for a manager, or has a complaint about a previous service"
              className={textareaCls}
              value={form.escalation_rules}
              onChange={(e) => set('escalation_rules', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 3: Knowledge Base */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
            <p className="text-sm text-gray-500 mt-1">
              Give the AI the information it needs to answer calls. You can add more later.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Services & Pricing</label>
            <textarea
              placeholder={"List your main services and pricing, e.g.:\n- Tire installation: $25/tire\n- Tire rotation: $20\n- Flat repair: $15\n- Alignment: $79.99\n- We carry Michelin, Goodyear, BFGoodrich"}
              className={textareaCls + ' min-h-[140px]'}
              value={form.kb_services}
              onChange={(e) => set('kb_services', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours</label>
            <textarea
              placeholder={"e.g.:\nMonday-Friday: 8:00 AM - 5:30 PM\nSaturday: 8:00 AM - 2:00 PM\nSunday: Closed"}
              className={textareaCls}
              value={form.kb_hours}
              onChange={(e) => set('kb_hours', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FAQ</label>
            <textarea
              placeholder={"Common questions and answers, e.g.:\nQ: Do you offer financing?\nA: Yes, we offer 6-month no-interest financing on purchases over $500.\n\nQ: How long does a tire install take?\nA: Usually about 45 minutes."}
              className={textareaCls + ' min-h-[140px]'}
              value={form.kb_faq}
              onChange={(e) => set('kb_faq', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 4: Review & Launch */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Review & Launch</h2>
            <p className="text-sm text-gray-500 mt-1">
              Review everything and launch the AI receptionist
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
            {/* Business summary */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Business</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-gray-500">Name</dt>
                <dd className="text-gray-900 font-medium">{form.name}</dd>
                <dt className="text-gray-500">Slug</dt>
                <dd className="text-gray-900">{form.slug}</dd>
                <dt className="text-gray-500">Owner</dt>
                <dd className="text-gray-900">{form.owner_name}</dd>
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-900">{form.owner_phone}</dd>
                {form.owner_email && (
                  <>
                    <dt className="text-gray-500">Email</dt>
                    <dd className="text-gray-900">{form.owner_email}</dd>
                  </>
                )}
                <dt className="text-gray-500">Timezone</dt>
                <dd className="text-gray-900">
                  {TIMEZONE_OPTIONS.find((t) => t.value === form.timezone)?.label}
                </dd>
                <dt className="text-gray-500">Tier</dt>
                <dd className="text-gray-900">
                  {TIER_OPTIONS.find((t) => t.value === form.subscription_tier)?.label}
                </dd>
              </dl>
            </div>

            {/* Agent summary */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                AI Receptionist
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-gray-500">Agent Name</dt>
                <dd className="text-gray-900">{form.agent_name || 'receptionist'}</dd>
                <dt className="text-gray-500">Voice</dt>
                <dd className="text-gray-900">
                  {VOICE_OPTIONS.find((v) => v.value === form.voice_id)?.label}
                </dd>
                {form.greeting && (
                  <>
                    <dt className="text-gray-500">Greeting</dt>
                    <dd className="text-gray-900 col-span-2 mt-1">&ldquo;{form.greeting}&rdquo;</dd>
                  </>
                )}
              </dl>
              {form.personality && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-500">Personality:</span> {form.personality}
                </p>
              )}
            </div>

            {/* KB summary */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Knowledge Base
              </h3>
              <div className="flex gap-3 text-sm">
                <span className={form.kb_services ? 'text-green-600' : 'text-gray-400'}>
                  {form.kb_services ? 'Services' : 'No services'}
                </span>
                <span className={form.kb_hours ? 'text-green-600' : 'text-gray-400'}>
                  {form.kb_hours ? 'Hours' : 'No hours'}
                </span>
                <span className={form.kb_faq ? 'text-green-600' : 'text-gray-400'}>
                  {form.kb_faq ? 'FAQ' : 'No FAQ'}
                </span>
              </div>
              {!form.kb_services && !form.kb_hours && !form.kb_faq && (
                <p className="mt-1 text-xs text-amber-600">
                  No knowledge base entries. The AI will use defaults only. You can add entries later.
                </p>
              )}
            </div>
          </div>

          {/* Area code input */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number Area Code
            </label>
            <input
              type="text"
              maxLength={3}
              placeholder="e.g., 423"
              className={inputCls}
              value={form.area_code}
              onChange={(e) => set('area_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
            <p className="mt-1 text-xs text-gray-400">
              US area code for the AI phone number. Leave blank for any available number.
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/clients')}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? 'Launching...' : 'Launch AI Receptionist'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
