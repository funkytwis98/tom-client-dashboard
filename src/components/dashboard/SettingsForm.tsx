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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

interface SocialConnection {
  id: string
  platform: string
  status: string
  account_name: string | null
  connected_at: string | null
}

interface BusinessHour {
  id: string
  day_of_week: number
  is_open: boolean
  open_time: string | null
  close_time: string | null
}

interface ServicePricing {
  id: string
  service_name: string
  price_text: string | null
  notes: string | null
  sort_order: number | null
  is_active: boolean
}

interface SettingsFormProps {
  clientId: string
  email: string
  initialBusiness: BusinessData
  initialReceptionist: ReceptionistData
  productsEnabled?: string[]
  socialConnections?: SocialConnection[]
  businessHours?: BusinessHour[]
  services?: ServicePricing[]
}

export function SettingsForm({
  clientId,
  email,
  initialBusiness,
  initialReceptionist,
  productsEnabled = [],
  socialConnections = [],
  businessHours = [],
  services = [],
}: SettingsFormProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const hasReceptionist = productsEnabled.includes('receptionist')
  const hasSocial = productsEnabled.includes('social')

  // Voice options from Retell
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([])
  const [voicesLoading, setVoicesLoading] = useState(hasReceptionist)

  // Business form
  const [biz, setBiz] = useState(initialBusiness)
  const [bizDirty, setBizDirty] = useState(false)
  const [isSavingBiz, startSaveBiz] = useTransition()

  // Receptionist form
  const [rec, setRec] = useState(initialReceptionist)
  const [recDirty, setRecDirty] = useState(false)
  const [isSavingRec, startSaveRec] = useTransition()

  // Fetch available voices from Retell on mount (only when receptionist is enabled)
  useEffect(() => {
    if (!hasReceptionist) return
    let cancelled = false
    async function fetchVoices() {
      try {
        const res = await fetch('/api/settings/voices')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setVoiceOptions(data.voices)
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setVoicesLoading(false)
      }
    }
    fetchVoices()
    return () => { cancelled = true }
  }, [hasReceptionist])

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

  const currentVoiceInList = voiceOptions.some(v => v.value === rec.voice_id)

  // Sort hours by day (Mon=1 first, Sun=0 last)
  const sortedHours = [...businessHours].sort((a, b) => {
    const aKey = a.day_of_week === 0 ? 7 : a.day_of_week
    const bKey = b.day_of_week === 0 ? 7 : b.day_of_week
    return aKey - bKey
  })

  return (
    <div className="space-y-6">
      {/* Business Information — always visible */}
      <section className={cardCls}>
        <h2 className="text-lg font-bold text-[#111] mb-5">Business Information</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Business Name</label>
            <input type="text" className={inputCls} value={biz.name} onChange={e => updateBiz('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Owner Name</label>
            <input type="text" className={inputCls} value={biz.owner_name} onChange={e => updateBiz('owner_name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" className={inputCls} value={biz.owner_phone} onChange={e => updateBiz('owner_phone', e.target.value)} />
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

      {/* Business Hours — always visible */}
      <section className={cardCls}>
        <h2 className="text-lg font-bold text-[#111] mb-5">Business Hours</h2>
        {sortedHours.length === 0 ? (
          <p className="text-sm text-gray-500">No business hours configured yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedHours.map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-[#333] w-28">{DAY_NAMES[h.day_of_week]}</span>
                {h.is_open ? (
                  <span className="text-sm text-[#111]">
                    {formatTime(h.open_time)} &ndash; {formatTime(h.close_time)}
                  </span>
                ) : (
                  <span className="text-sm text-[#999]">Closed</span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">Contact your agency to update business hours.</p>
      </section>

      {/* Services & Pricing — always visible */}
      <section className={cardCls}>
        <h2 className="text-lg font-bold text-[#111] mb-5">Services &amp; Pricing</h2>
        {services.length === 0 ? (
          <p className="text-sm text-gray-500">No services configured yet.</p>
        ) : (
          <div className="space-y-3">
            {services.map(svc => (
              <div key={svc.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#111]">{svc.service_name}</p>
                  {svc.notes && <p className="text-xs text-[#777] mt-0.5">{svc.notes}</p>}
                </div>
                {svc.price_text && (
                  <span className="text-sm font-semibold text-[#111] ml-4 shrink-0">{svc.price_text}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">Contact your agency to update services and pricing.</p>
      </section>

      {/* Receptionist Settings — only when receptionist is enabled */}
      {hasReceptionist && (
        <section className={cardCls}>
          <h2 className="text-lg font-bold text-[#111] mb-5">Receptionist Settings</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Receptionist Name</label>
              <input type="text" className={inputCls} value={rec.agent_name} onChange={e => updateRec('agent_name', e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">The name your receptionist uses on calls</p>
            </div>
            <div>
              <label className={labelCls}>Greeting Message</label>
              <textarea rows={3} className={inputCls} value={rec.greeting} onChange={e => updateRec('greeting', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Voice</label>
              <select className={inputCls} value={rec.voice_id} onChange={e => updateRec('voice_id', e.target.value)} disabled={voicesLoading}>
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
              <select className={inputCls} value={rec.language} onChange={e => updateRec('language', e.target.value)}>
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
      )}

      {/* Social Connections — only when social is enabled */}
      {hasSocial && (
        <section className={cardCls}>
          <h2 className="text-lg font-bold text-[#111] mb-5">Social Connections</h2>
          {socialConnections.length === 0 ? (
            <p className="text-sm text-gray-500">No social accounts connected yet. Connections will appear here once set up.</p>
          ) : (
            <div className="space-y-3">
              {socialConnections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600 uppercase">
                        {conn.platform.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111] capitalize">{conn.platform}</p>
                      <p className="text-xs text-gray-500">{conn.account_name || 'No account name'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    conn.status === 'connected'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {conn.status === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Account — always visible */}
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

function formatTime(time: string | null): string {
  if (!time) return ''
  // time is "HH:MM" or "HH:MM:SS" — convert to 12h
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}
