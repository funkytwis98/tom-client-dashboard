'use client'

import { useState, useTransition, useCallback } from 'react'
import { Pencil, Trash2, Plus, X, Clock, Calendar } from 'lucide-react'
import {
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
} from '@/app/actions/knowledge'
import type { KnowledgeEntry } from '@/types/domain'

// ── Types ──────────────────────────────────────────────────────────

interface ServiceRow {
  id: string
  service_name: string
  price_text: string
  notes: string
  sort_order: number
}

interface HoursRow {
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
}

type Tab = 'services' | 'hours' | 'faq' | 'policies' | 'promotions'

interface KnowledgeEditorProps {
  clientId: string
  agentName: string
  initialEntries: KnowledgeEntry[]
  initialServices: ServiceRow[]
  initialHours: HoursRow[]
}

// ── Constants ──────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'services', label: 'Services & Pricing' },
  { key: 'hours', label: 'Hours' },
  { key: 'faq', label: 'FAQs' },
  { key: 'policies', label: 'Policies' },
  { key: 'promotions', label: 'Promotions' },
]

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TIME_OPTIONS: string[] = []
for (let h = 5; h <= 22; h++) {
  for (const m of [0, 30]) {
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    const suffix = h >= 12 ? 'PM' : 'AM'
    const min = m === 0 ? '00' : '30'
    TIME_OPTIONS.push(`${hour12}:${min} ${suffix}`)
  }
}

const cardClass = 'rounded-[14px] border border-[#e5e7eb] bg-white p-6'
const cardShadow = { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }

// ── Main Component ─────────────────────────────────────────────────

export function KnowledgeEditor({
  clientId,
  agentName,
  initialEntries,
  initialServices,
  initialHours,
}: KnowledgeEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('services')

  return (
    <div>
      {/* Tab pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              activeTab === key
                ? 'bg-[#111] text-white border-[#111]'
                : 'bg-white text-[#666] border-[#e5e7eb] hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'services' && (
        <ServicesSection agentName={agentName} initialServices={initialServices} />
      )}
      {activeTab === 'hours' && (
        <HoursSection agentName={agentName} initialHours={initialHours} />
      )}
      {activeTab === 'faq' && (
        <KBSection clientId={clientId} agentName={agentName} category="faq" initialEntries={initialEntries} />
      )}
      {activeTab === 'policies' && (
        <KBSection clientId={clientId} agentName={agentName} category="policies" initialEntries={initialEntries} />
      )}
      {activeTab === 'promotions' && (
        <PromotionsSection clientId={clientId} agentName={agentName} initialEntries={initialEntries} />
      )}
    </div>
  )
}

// ── Services & Pricing ─────────────────────────────────────────────

function ServicesSection({
  agentName,
  initialServices,
}: {
  agentName: string
  initialServices: ServiceRow[]
}) {
  const [services, setServices] = useState<ServiceRow[]>(initialServices)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ service_name: '', price_text: '', notes: '' })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    if (!form.service_name.trim()) {
      setError('Service name is required.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        if (editingId) {
          const res = await fetch('/api/knowledge-base/services', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...form }),
          })
          const updated = await res.json()
          if (!res.ok) throw new Error(updated.error)
          setServices((prev) => prev.map((s) => (s.id === editingId ? updated : s)))
        } else {
          const res = await fetch('/api/knowledge-base/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
          const created = await res.json()
          if (!res.ok) throw new Error(created.error)
          setServices((prev) => [...prev, created])
        }
        setEditingId(null)
        setShowAdd(false)
        setForm({ service_name: '', price_text: '', notes: '' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }, [form, editingId])

  const handleDelete = useCallback((id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    startTransition(async () => {
      const res = await fetch(`/api/knowledge-base/services?id=${id}`, { method: 'DELETE' })
      if (res.ok) setServices((prev) => prev.filter((s) => s.id !== id))
    })
  }, [])

  return (
    <div className={cardClass} style={cardShadow}>
      <p className="text-sm text-[#888] mb-5">
        These are the services and prices {agentName} will quote to callers. Add, edit, or remove services as needed.
      </p>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* Header row */}
      <div className="hidden md:grid grid-cols-[1fr_140px_1fr_70px] gap-3 pb-2 border-b border-[#e5e7eb] mb-1">
        <span className="text-[11px] uppercase font-bold text-[#999]">Service</span>
        <span className="text-[11px] uppercase font-bold text-[#999]">Price</span>
        <span className="text-[11px] uppercase font-bold text-[#999]">Notes</span>
        <span />
      </div>

      {/* Service rows */}
      {services.map((s) =>
        editingId === s.id ? (
          <div key={s.id} className="grid md:grid-cols-[1fr_140px_1fr_70px] gap-3 py-3 bg-[#fefce8] px-3 rounded-lg my-1">
            <input
              value={form.service_name}
              onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
              className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
              placeholder="Service name"
            />
            <input
              value={form.price_text}
              onChange={(e) => setForm((f) => ({ ...f, price_text: e.target.value }))}
              className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
              placeholder="Price"
            />
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
              placeholder="Notes"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="rounded-lg bg-[#FFD700] px-3 py-2 text-xs font-semibold text-[#111] hover:bg-[#e6c200] disabled:opacity-50"
              >
                Done
              </button>
              <button
                onClick={() => { setEditingId(null); setForm({ service_name: '', price_text: '', notes: '' }) }}
                className="rounded p-1.5 text-[#999] hover:text-[#111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div key={s.id} className="grid md:grid-cols-[1fr_140px_1fr_70px] gap-3 py-3 border-b border-[#f3f4f6] items-center">
            <span className="text-sm font-medium text-[#111]">{s.service_name}</span>
            <span className="text-sm font-semibold text-[#16a34a]">{s.price_text}</span>
            <span className="text-[13px] text-[#888]">{s.notes || '\u2014'}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingId(s.id)
                  setForm({ service_name: s.service_name, price_text: s.price_text, notes: s.notes })
                  setShowAdd(false)
                }}
                className="rounded p-1.5 text-[#999] hover:bg-gray-100 hover:text-gray-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(s.id, s.service_name)}
                disabled={isPending}
                className="rounded p-1.5 text-[#999] hover:bg-red-50 hover:text-[#dc2626] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Add row */}
      {showAdd && (
        <div className="grid md:grid-cols-[1fr_140px_1fr_70px] gap-3 py-3 bg-[#f0fdf4] px-3 rounded-lg mt-2">
          <input
            value={form.service_name}
            onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
            className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
            placeholder="Service name"
            autoFocus
          />
          <input
            value={form.price_text}
            onChange={(e) => setForm((f) => ({ ...f, price_text: e.target.value }))}
            className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
            placeholder="Price"
          />
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
            placeholder="Notes (optional)"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-[#FFD700] px-3 py-2 text-xs font-semibold text-[#111] hover:bg-[#e6c200] disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setForm({ service_name: '', price_text: '', notes: '' }) }}
              className="rounded p-1.5 text-[#999] hover:text-[#111]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!showAdd && editingId === null && (
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ service_name: '', price_text: '', notes: '' }); setError(null) }}
          className="mt-4 w-full rounded-lg border-2 border-dashed border-[#e5e7eb] py-3 text-sm font-medium text-[#999] hover:border-[#ccc] hover:text-[#666] transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      )}
    </div>
  )
}

// ── Hours ──────────────────────────────────────────────────────────

function HoursSection({
  agentName,
  initialHours,
}: {
  agentName: string
  initialHours: HoursRow[]
}) {
  // Ensure all 7 days exist
  const defaultHours: HoursRow[] = DAY_NAMES.map((_, i) => {
    const existing = initialHours.find((h) => h.day_of_week === i)
    return existing ?? { day_of_week: i, is_open: i < 5, open_time: '9:00 AM', close_time: '5:00 PM' }
  })

  const [hours, setHours] = useState<HoursRow[]>(defaultHours)
  const [saved, setSaved] = useState(JSON.stringify(defaultHours))
  const [isPending, startTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const hasChanges = JSON.stringify(hours) !== saved
  const today = new Date().getDay()
  // JS getDay(): 0=Sun, 1=Mon... Our array: 0=Mon...6=Sun
  const todayIndex = today === 0 ? 6 : today - 1

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const res = await fetch('/api/knowledge-base/hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours),
      })
      if (res.ok) {
        setSaved(JSON.stringify(hours))
        setSaveMsg('Hours saved!')
        setTimeout(() => setSaveMsg(null), 2000)
      }
    })
  }, [hours])

  return (
    <div className={cardClass} style={cardShadow}>
      <p className="text-sm text-[#888] mb-5">
        Set your business hours. {agentName} will tell callers when you are open or closed.
      </p>

      <div className="space-y-0">
        {hours.map((h, i) => {
          const isToday = i === todayIndex
          return (
            <div
              key={i}
              className={`flex items-center gap-4 py-3 px-3 rounded-lg ${
                isToday ? 'bg-[#fffbeb] border border-[#fde68a]' : i % 2 === 0 ? 'bg-[#fafafa]' : ''
              }`}
            >
              <div className="w-[120px] flex items-center gap-2">
                <span className={`text-sm ${isToday ? 'font-bold text-[#111]' : 'font-medium text-[#555]'}`}>
                  {DAY_NAMES[i]}
                </span>
                {isToday && (
                  <span className="text-[10px] font-bold text-[#FFD700] bg-[#111] px-1.5 py-0.5 rounded">
                    TODAY
                  </span>
                )}
              </div>

              <button
                onClick={() =>
                  setHours((prev) =>
                    prev.map((d, idx) => (idx === i ? { ...d, is_open: !d.is_open } : d))
                  )
                }
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  h.is_open
                    ? 'bg-[#dcfce7] text-[#16a34a] hover:bg-[#bbf7d0]'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                {h.is_open ? 'Open' : 'Closed'}
              </button>

              {h.is_open ? (
                <div className="flex items-center gap-2">
                  <select
                    value={h.open_time}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((d, idx) => (idx === i ? { ...d, open_time: e.target.value } : d))
                      )
                    }
                    className="rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-sm focus:border-[#111] focus:outline-none"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-sm text-[#999]">to</span>
                  <select
                    value={h.close_time}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((d, idx) => (idx === i ? { ...d, close_time: e.target.value } : d))
                      )
                    }
                    className="rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-sm focus:border-[#111] focus:outline-none"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm italic text-[#999]">Closed all day</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[#FFD700] px-5 py-2.5 text-sm font-semibold text-[#111] hover:bg-[#e6c200] disabled:opacity-40 transition-colors"
        >
          <Clock className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save Hours'}
        </button>
        {saveMsg && <span className="text-sm text-[#16a34a] font-medium">{saveMsg}</span>}
      </div>
    </div>
  )
}

// ── FAQ & Policies Section (shared) ────────────────────────────────

function KBSection({
  clientId,
  agentName,
  category,
  initialEntries,
}: {
  clientId: string
  agentName: string
  category: 'faq' | 'policies'
  initialEntries: KnowledgeEntry[]
}) {
  const entries = initialEntries.filter((e) => e.category === category && e.is_active)
  const [items, setItems] = useState<KnowledgeEntry[]>(entries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const subtitle = category === 'faq'
    ? `Common questions callers ask. ${agentName} will use these to give accurate answers.`
    : `Warranty, return policies, and other important information ${agentName} should know.`

  const addLabel = category === 'faq' ? 'Add FAQ' : 'Add Policy'
  const titleLabel = category === 'faq' ? 'Question' : 'Title'
  const contentLabel = category === 'faq' ? 'Answer' : 'Content'

  const handleSave = useCallback(() => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Both fields are required.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const result = await saveKnowledgeEntry({
          ...(editingId ? { id: editingId } : {}),
          client_id: clientId,
          category,
          title: form.title.trim(),
          content: form.content.trim(),
          priority: 0,
          is_active: true,
        })
        if (editingId) {
          setItems((prev) => prev.map((e) => (e.id === editingId ? result.entry : e)))
        } else {
          setItems((prev) => [...prev, result.entry])
        }
        setEditingId(null)
        setShowAdd(false)
        setForm({ title: '', content: '' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }, [form, editingId, clientId, category])

  const handleDelete = useCallback((entry: KnowledgeEntry) => {
    if (!confirm(`Delete "${entry.title}"?`)) return
    startTransition(async () => {
      await deleteKnowledgeEntry(entry.id, clientId)
      setItems((prev) => prev.filter((e) => e.id !== entry.id))
    })
  }, [clientId])

  return (
    <div className={cardClass} style={cardShadow}>
      <p className="text-sm text-[#888] mb-5">{subtitle}</p>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {items.map((entry) =>
          editingId === entry.id ? (
            <div key={entry.id} className="rounded-lg border border-[#e5e7eb] bg-[#fefce8] p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">{titleLabel}</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">{contentLabel}</label>
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none resize-y"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-[#111] hover:bg-[#e6c200] disabled:opacity-50"
                >
                  Done
                </button>
                <button
                  onClick={() => { setEditingId(null); setForm({ title: '', content: '' }) }}
                  className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm text-[#555] hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={entry.id} className="rounded-lg border border-[#f3f4f6] bg-[#fafafa] px-5 py-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#111]">
                    {category === 'faq' ? `Q: ${entry.title}` : entry.title}
                  </p>
                  <p className="mt-1.5 text-[13px] text-[#666] leading-relaxed">
                    {category === 'faq' ? `A: ${entry.content}` : entry.content}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <button
                    onClick={() => {
                      setEditingId(entry.id)
                      setForm({ title: entry.title, content: entry.content })
                      setShowAdd(false)
                    }}
                    className="rounded p-1.5 text-[#999] hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    disabled={isPending}
                    className="rounded p-1.5 text-[#999] hover:bg-red-50 hover:text-[#dc2626] disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {showAdd && (
        <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f0fdf4] p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">{titleLabel}</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">{contentLabel}</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none resize-y"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-[#111] hover:bg-[#e6c200] disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setForm({ title: '', content: '' }) }}
              className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm text-[#555] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAdd && editingId === null && (
        <button
          onClick={() => { setShowAdd(true); setError(null); setForm({ title: '', content: '' }) }}
          className="mt-4 w-full rounded-lg border-2 border-dashed border-[#e5e7eb] py-3 text-sm font-medium text-[#999] hover:border-[#ccc] hover:text-[#666] transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      )}

      {items.length === 0 && !showAdd && (
        <div className="mt-4 text-center py-8">
          <p className="text-sm text-gray-400">No {category === 'faq' ? 'FAQs' : 'policies'} yet.</p>
        </div>
      )}
    </div>
  )
}

// ── Promotions Section ─────────────────────────────────────────────

function PromotionsSection({
  clientId,
  agentName,
  initialEntries,
}: {
  clientId: string
  agentName: string
  initialEntries: KnowledgeEntry[]
}) {
  const promos = initialEntries.filter((e) => e.category === 'promotions' && e.is_active)
  const [items, setItems] = useState<KnowledgeEntry[]>(promos)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', expires_at: '' })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAdd = useCallback(() => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and description are required.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const result = await saveKnowledgeEntry({
          client_id: clientId,
          category: 'promotions',
          title: form.title.trim(),
          content: form.content.trim(),
          priority: 0,
          is_active: true,
        })
        setItems((prev) => [...prev, result.entry])
        setShowAdd(false)
        setForm({ title: '', content: '', expires_at: '' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }, [form, clientId])

  const handleDelete = useCallback((entry: KnowledgeEntry) => {
    if (!confirm(`Delete "${entry.title}"?`)) return
    startTransition(async () => {
      await deleteKnowledgeEntry(entry.id, clientId)
      setItems((prev) => prev.filter((e) => e.id !== entry.id))
    })
  }, [clientId])

  const now = new Date()

  return (
    <div className={cardClass} style={cardShadow}>
      <p className="text-sm text-[#888] mb-5">
        Current deals and promotions. {agentName} will mention these when relevant. Expired promos are automatically hidden from callers.
      </p>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {items.map((entry) => {
          const expiresAt = (entry as KnowledgeEntry & { expires_at?: string }).expires_at
          const isExpired = expiresAt ? new Date(expiresAt) < now : false

          return (
            <div
              key={entry.id}
              className={`rounded-lg border px-5 py-4 ${
                isExpired
                  ? 'bg-gray-50 border-[#e5e7eb] opacity-60'
                  : 'bg-[#fffbeb] border-[#FFD700]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#111]">{entry.title}</p>
                  <p className="mt-1 text-[13px] text-[#666]">{entry.content}</p>
                  <div className="mt-2">
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <Calendar className="h-3 w-3" />
                        Expired
                      </span>
                    ) : expiresAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16a34a] bg-[#dcfce7] px-2 py-0.5 rounded-full">
                        <Calendar className="h-3 w-3" />
                        Ends {new Date(expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Calendar className="h-3 w-3" />
                        No expiry
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry)}
                  disabled={isPending}
                  className="rounded p-1.5 text-[#999] hover:bg-red-50 hover:text-[#dc2626] disabled:opacity-50 shrink-0 ml-3"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f0fdf4] p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
              placeholder="e.g., Buy 3 Get 4th at 50% Off"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">Description</label>
            <textarea
              rows={3}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none resize-y"
              placeholder="Details about the promotion..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">
              Expiry date <span className="text-[#999] font-normal">(leave blank for no expiry)</span>
            </label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-[#111] hover:bg-[#e6c200] disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setForm({ title: '', content: '', expires_at: '' }) }}
              className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm text-[#555] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAdd && (
        <button
          onClick={() => { setShowAdd(true); setError(null); setForm({ title: '', content: '', expires_at: '' }) }}
          className="mt-4 w-full rounded-lg border-2 border-dashed border-[#e5e7eb] py-3 text-sm font-medium text-[#999] hover:border-[#ccc] hover:text-[#666] transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Promotion
        </button>
      )}

      {items.length === 0 && !showAdd && (
        <div className="mt-4 text-center py-8">
          <p className="text-sm text-gray-400">No promotions yet.</p>
        </div>
      )}
    </div>
  )
}
