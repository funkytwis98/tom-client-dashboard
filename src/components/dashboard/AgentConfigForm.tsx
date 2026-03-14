'use client'

import { useState, useTransition } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { updateAgentConfig, syncRetellAgent } from '@/app/actions/agents'
import type { AgentConfig } from '@/types/domain'

interface AgentConfigFormProps {
  clientId: string
  initialConfig: AgentConfig | null
}

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-US', label: 'Spanish (US)' },
  { value: 'fr-CA', label: 'French (Canada)' },
]

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

export function AgentConfigForm({ clientId, initialConfig }: AgentConfigFormProps) {
  const [form, setForm] = useState({
    agent_name: initialConfig?.agent_name ?? 'receptionist',
    greeting: initialConfig?.greeting ?? '',
    personality: initialConfig?.personality ?? '',
    sales_style: initialConfig?.sales_style ?? '',
    escalation_rules: initialConfig?.escalation_rules ?? '',
    voicemail_message: initialConfig?.voicemail_message ?? '',
    voice_id: initialConfig?.voice_id ?? '',
    language: initialConfig?.language ?? 'en-US',
    custom_instructions: initialConfig?.custom_instructions ?? '',
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isSaving, startSave] = useTransition()
  const [isSyncing, startSync] = useTransition()

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
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => setForm((f) => ({ ...f, [key]: e.target.value })),
    }
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

  function handleSave() {
    startSave(async () => {
      try {
        await updateAgentConfig({
          client_id: clientId,
          agent_name: form.agent_name,
          greeting: form.greeting || null,
          personality: form.personality || null,
          sales_style: form.sales_style || null,
          escalation_rules: form.escalation_rules || null,
          voicemail_message: form.voicemail_message || null,
          voice_id: form.voice_id || null,
          language: form.language,
          custom_instructions: form.custom_instructions || null,
        })
        addToast('Settings saved.', 'success')
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Save failed.', 'error')
      }
    })
  }

  function handleSaveAndSync() {
    startSync(async () => {
      try {
        await updateAgentConfig({
          client_id: clientId,
          agent_name: form.agent_name,
          greeting: form.greeting || null,
          personality: form.personality || null,
          sales_style: form.sales_style || null,
          escalation_rules: form.escalation_rules || null,
          voicemail_message: form.voicemail_message || null,
          voice_id: form.voice_id || null,
          language: form.language,
          custom_instructions: form.custom_instructions || null,
        })
        await syncRetellAgent(clientId)
        addToast('Agent updated and synced to Retell!', 'success')
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Sync failed.', 'error')
      }
    })
  }

  const isLoading = isSaving || isSyncing

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

      <div className="space-y-6">
        {/* Agent Identity */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Agent Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Name
              </label>
              <input
                type="text"
                placeholder="e.g., Tom"
                className={inputCls}
                {...field('agent_name')}
              />
              <p className="mt-1 text-xs text-gray-400">
                What the AI calls itself during calls
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice ID
              </label>
              <input
                type="text"
                placeholder="e.g., 11labs-Adrian"
                className={inputCls}
                {...field('voice_id')}
              />
              <p className="mt-1 text-xs text-gray-400">
                Find voice IDs in the Retell AI dashboard under Voices
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select className={inputCls} {...field('language')}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Conversation */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Conversation
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Greeting
              </label>
              <textarea
                rows={2}
                placeholder='e.g., "Thanks for calling Interstate Tires, this is Tom, how can I help you today?"'
                className={inputCls}
                {...field('greeting')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personality
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Friendly, professional, and knowledgeable about tires. Warm but efficient. Uses clear, simple language."
                className={inputCls}
                {...field('personality')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Style
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Consultative — ask good questions to understand the caller's need before suggesting services. Never pushy."
                className={inputCls}
                {...field('sales_style')}
              />
            </div>
          </div>
        </section>

        {/* Handling */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Call Handling
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Escalation Rules
              </label>
              <textarea
                rows={3}
                placeholder='e.g., "If the caller is upset or needs a manager, say: Let me have our manager call you right back within the hour."'
                className={inputCls}
                {...field('escalation_rules')}
              />
              <p className="mt-1 text-xs text-gray-400">
                When and how the AI should escalate to the business owner
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                After-Hours Voicemail Message
              </label>
              <textarea
                rows={3}
                placeholder='e.g., "Thanks for calling Interstate Tires. We are currently closed. Our hours are Monday through Friday, 8 AM to 5 PM. Please leave a message and we will call you back first thing tomorrow."'
                className={inputCls}
                {...field('voicemail_message')}
              />
            </div>
          </div>
        </section>

        {/* Advanced */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Advanced
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Instructions{' '}
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={5}
              placeholder="Additional rules or instructions for the AI beyond the defaults. Use sparingly."
              className={inputCls}
              {...field('custom_instructions')}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            onClick={handleSaveAndSync}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Save & Sync to Retell'}
          </button>
        </div>
      </div>
    </div>
  )
}
