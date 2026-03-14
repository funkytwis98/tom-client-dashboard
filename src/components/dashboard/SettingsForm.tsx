'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/dashboard/Toast'

interface VoiceOption {
  value: string
  label: string
}

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English' },
  { value: 'es-US', label: 'Spanish' },
  { value: 'multi', label: 'Bilingual (English + Spanish)' },
]

interface BusinessData {
  name: string
  owner_name: string
  owner_phone: string
}

interface ReceptionistData {
  agent_name: string
  greeting: string
  voice_id: string
  language: string
}

interface SettingsFormProps {
  clientId: string
  email: string
  initialBusiness: BusinessData
  initialReceptionist: ReceptionistData
}

export function SettingsForm({ clientId, email, initialBusiness, initialReceptionist }: SettingsFormProps) {
  const { showToast } = useToast()
  const router = useRouter()

  // Voice options from Retell
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)

  // Business form
  const [biz, setBiz] = useState(initialBusiness)
  const [bizDirty, setBizDirty] = useState(false)
  const [isSavingBiz, startSaveBiz] = useTransition()

  // Receptionist form
  const [rec, setRec] = useState(initialReceptionist)
  const [recDirty, setRecDirty] = useState(false)
  const [isSavingRec, startSaveRec] = useTransition()

  // Fetch available voices from Retell on mount
  useEffect(() => {
    let cancelled = false
    async function fetchVoices() {
      try {
        const res = await fetch('/api/settings/voices')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setVoiceOptions(data.voices)
          }
        }
      } catch {
        // Silently fail — dropdown will show current voice_id as fallback
      } finally {
        if (!cancelled) setVoicesLoading(false)
      }
    }
    fetchVoices()
    return () => { cancelled = true }
  }, [])

  function updateBiz<K extends keyof BusinessData>(key: K, value: BusinessData[K]) {
    setBiz(prev => ({ ...prev, [key]: value }))
    setBizDirty(true)
  }

  function updateRec<K extends keyof ReceptionistData>(key: K, value: ReceptionistData[K]) {
    setRec(prev => ({ ...prev, [key]: value }))
    setRecDirty(true)
  }

  function handleSaveBusiness() {
    startSaveBiz(async () => {
      try {
        const res = await fetch('/api/settings/business', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, ...biz }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save')
        }
        setBizDirty(false)
        showToast('Business info saved', 'success')
        router.refresh()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Save failed', 'error')
      }
    })
  }

  function handleSaveReceptionist() {
    startSaveRec(async () => {
      try {
        const res = await fetch('/api/settings/receptionist', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, ...rec }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save')
        }
        setRecDirty(false)
        if (data.warning) {
          showToast(data.warning, 'warning')
        } else {
          showToast('Receptionist settings saved', 'success')
        }
        router.refresh()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Save failed', 'error')
      }
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inputCls =
    'w-full bg-white border border-[#e5e7eb] rounded-lg px-3.5 py-3 text-sm focus:border-[#FFD700] focus:outline-none focus:ring-1 focus:ring-[#FFD700]'
  const labelCls = 'block text-[13px] font-medium text-[#555] mb-1.5'
  const cardCls = 'bg-white rounded-[14px] border border-[#e5e7eb] p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'

  // If the current voice_id isn't in the fetched list, show it as a fallback option
  const currentVoiceInList = voiceOptions.some(v => v.value === rec.voice_id)

  return (
    <div className="space-y-6">
      {/* Section 1: Business Information */}
      <section className={cardCls}>
        <h2 className="text-lg font-bold text-[#111] mb-5">Business Information</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Business Name</label>
            <input
              type="text"
              className={inputCls}
              value={biz.name}
              onChange={e => updateBiz('name', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Owner Name</label>
            <input
              type="text"
              className={inputCls}
              value={biz.owner_name}
              onChange={e => updateBiz('owner_name', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              type="tel"
              className={inputCls}
              value={biz.owner_phone}
              onChange={e => updateBiz('owner_phone', e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={handleSaveBusiness}
            disabled={!bizDirty || isSavingBiz}
            className="bg-[#FFD700] text-[#111] font-semibold text-sm rounded-[14px] px-6 py-3 disabled:opacity-50 hover:brightness-95 transition-all"
          >
            {isSavingBiz ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>

      {/* Section 2: Receptionist Settings */}
      <section className={cardCls}>
        <h2 className="text-lg font-bold text-[#111] mb-5">Receptionist Settings</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Receptionist Name</label>
            <input
              type="text"
              className={inputCls}
              value={rec.agent_name}
              onChange={e => updateRec('agent_name', e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">The name your receptionist uses on calls</p>
          </div>
          <div>
            <label className={labelCls}>Greeting Message</label>
            <textarea
              rows={3}
              className={inputCls}
              value={rec.greeting}
              onChange={e => updateRec('greeting', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Voice</label>
            <select
              className={inputCls}
              value={rec.voice_id}
              onChange={e => updateRec('voice_id', e.target.value)}
              disabled={voicesLoading}
            >
              {voicesLoading ? (
                <option>Loading voices...</option>
              ) : (
                <>
                  <option value="">Select a voice...</option>
                  {!currentVoiceInList && rec.voice_id && (
                    <option value={rec.voice_id}>{rec.voice_id} (current)</option>
                  )}
                  {voiceOptions.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className={labelCls}>Language</label>
            <select
              className={inputCls}
              value={rec.language}
              onChange={e => updateRec('language', e.target.value)}
            >
              {LANGUAGE_OPTIONS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={handleSaveReceptionist}
            disabled={!recDirty || isSavingRec}
            className="bg-[#FFD700] text-[#111] font-semibold text-sm rounded-[14px] px-6 py-3 disabled:opacity-50 hover:brightness-95 transition-all"
          >
            {isSavingRec ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>

      {/* Section 3: Account */}
      <section className={cardCls}>
        <h2 className="text-lg font-bold text-[#111] mb-5">Account</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <p className="text-sm text-gray-900">{email}</p>
          </div>
          <div>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
