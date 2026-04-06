'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/dashboard/Toast'

interface SocialSettings {
  id: string
  client_id: string
  platforms: string[]
  posting_frequency: string
  preferred_times: string[]
  tone: string | null
  topics_to_avoid: string | null
}

interface SocialSettingsFormProps {
  clientId: string
  initialSettings: SocialSettings | null
}

const FREQUENCY_OPTIONS = [
  { value: '1_per_week', label: '1 per week' },
  { value: '3_per_week', label: '3 per week' },
  { value: '5_per_week', label: '5 per week' },
  { value: 'daily', label: 'Daily' },
]

const TIME_OPTIONS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
]

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

export default function SocialSettingsForm({ clientId, initialSettings }: SocialSettingsFormProps) {
  const { showToast } = useToast()

  const [platforms, setPlatforms] = useState<string[]>(initialSettings?.platforms ?? ['facebook', 'instagram'])
  const [frequency, setFrequency] = useState(initialSettings?.posting_frequency ?? '3_per_week')
  const [times, setTimes] = useState<string[]>(initialSettings?.preferred_times ?? ['9:00 AM', '6:00 PM'])
  const [tone, setTone] = useState(initialSettings?.tone ?? '')
  const [topicsToAvoid, setTopicsToAvoid] = useState(initialSettings?.topics_to_avoid ?? '')
  const [saving, setSaving] = useState(false)

  function togglePlatform(p: string) {
    setPlatforms((prev) => {
      if (prev.includes(p)) {
        if (prev.length <= 1) return prev
        return prev.filter((x) => x !== p)
      }
      return [...prev, p]
    })
  }

  function updateTime(index: number, value: string) {
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  function addTime() {
    if (times.length >= 4) return
    setTimes((prev) => [...prev, '12:00 PM'])
  }

  function removeTime(index: number) {
    if (times.length <= 1) return
    setTimes((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)

    const supabase = createClient()
    const payload = {
      client_id: clientId,
      platforms,
      posting_frequency: frequency,
      preferred_times: times,
      tone: tone.trim() || null,
      topics_to_avoid: topicsToAvoid.trim() || null,
      updated_at: new Date().toISOString(),
    }

    if (initialSettings?.id) {
      const { error } = await supabase
        .from('social_settings')
        .update(payload)
        .eq('id', initialSettings.id)

      if (error) {
        showToast(error.message, 'error')
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('social_settings')
        .insert(payload)

      if (error) {
        showToast(error.message, 'error')
        setSaving(false)
        return
      }
    }

    showToast('Social settings saved!', 'success')
    setSaving(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-8">
        {/* Platforms */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Platforms</h3>
          <p className="text-sm text-gray-500 mb-4">Select which platforms to post to. At least one must be selected.</p>
          <div className="flex gap-3">
            {['facebook', 'instagram'].map((p) => {
              const active = platforms.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              )
            })}
          </div>
        </section>

        {/* Posting Frequency */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Posting Frequency</h3>
          <p className="text-sm text-gray-500 mb-4">How often should Tom post for you?</p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  frequency === opt.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Preferred Posting Times */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Preferred Posting Times</h3>
          <p className="text-sm text-gray-500 mb-4">When should Tom schedule your posts?</p>
          <div className="space-y-3">
            {times.map((time, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={time}
                  onChange={(e) => updateTime(i, e.target.value)}
                  className={inputCls + ' max-w-[180px]'}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                    title="Remove time"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {times.length < 4 && (
              <button
                type="button"
                onClick={addTime}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
              >
                + Add another time
              </button>
            )}
          </div>
        </section>

        {/* Brand Voice / Tone */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Brand Voice / Tone</h3>
          <p className="text-sm text-gray-500 mb-4">How should your posts sound? Describe your brand&apos;s personality.</p>
          <textarea
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            rows={4}
            className={inputCls}
            placeholder="Example: Keep it professional but friendly. We're a family-owned shop that takes pride in quality work."
          />
        </section>

        {/* Topics to Avoid */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Topics to Avoid</h3>
          <p className="text-sm text-gray-500 mb-4">Anything you don&apos;t want Tom to post about?</p>
          <textarea
            value={topicsToAvoid}
            onChange={(e) => setTopicsToAvoid(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="Example: Don't mention competitors. Don't post about politics or religion."
          />
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
