'use client'

import { useOptimistic, useTransition, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { updateLeadStatus } from '@/app/actions/leads'
import { useToast } from '@/components/dashboard/Toast'
import { Target, Phone, Mail, Search, Trash2, Headphones, PhoneCall, Globe, UserCheck, UserPlus } from 'lucide-react'
import type { Lead, LeadWithCall } from '@/types/domain'

interface LeadsCardsProps {
  clientId: string
  initialLeads: LeadWithCall[]
  agentName?: string
  contactMap?: Record<string, string>
}

type StatusFilter = 'all' | 'new' | 'contacted' | 'booked' | 'lost'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
]

const STATUS_BUTTONS: { value: Lead['status']; label: string; activeColor: string }[] = [
  { value: 'new', label: 'New', activeColor: '#6366f1' },
  { value: 'contacted', label: 'Contacted', activeColor: '#2563eb' },
  { value: 'booked', label: 'Booked \u2713', activeColor: '#16a34a' },
  { value: 'lost', label: 'Lost', activeColor: '#dc2626' },
]

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return raw
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function UrgencyBadge({ urgency }: { urgency: Lead['urgency'] }) {
  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    high:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'High Priority' },
    urgent: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Urgent' },
    medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Medium' },
    low:    { bg: '#f0f9ff', text: '#2563eb', border: '#bfdbfe', label: 'Low' },
  }
  const c = config[urgency] ?? config.medium
  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 6,
      }}
    >
      {c.label}
    </span>
  )
}

function SourceBadge({ source }: { source?: string }) {
  if (source === 'website') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          backgroundColor: '#f0f9ff',
          color: '#6b7280',
          border: '1px solid #e5e7eb',
          fontSize: 10,
          fontWeight: 500,
          padding: '2px 7px',
          borderRadius: 6,
        }}
      >
        <Globe size={10} />
        Website
      </span>
    )
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#f9fafb',
        color: '#6b7280',
        border: '1px solid #e5e7eb',
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 7px',
        borderRadius: 6,
      }}
    >
      <PhoneCall size={10} />
      Call
    </span>
  )
}

function parseTranscript(transcript: string | null, agentName: string): { speaker: string; text: string }[] {
  if (!transcript) return []
  const lines = transcript.split('\n').filter(l => l.trim())
  const parsed: { speaker: string; text: string }[] = []
  for (const line of lines) {
    const match = line.match(/^(Agent|Caller|Customer|User|AI|Tom|Assistant|Bot)\s*:\s*(.+)/i)
    if (match) {
      const speaker = ['agent', 'ai', 'tom', 'assistant', 'bot'].includes(match[1].toLowerCase()) ? agentName : 'Caller'
      parsed.push({ speaker, text: match[2].trim() })
    } else {
      parsed.push({ speaker: 'Caller', text: line.trim() })
    }
  }
  return parsed
}

function ConfirmDialog({
  onCancel,
  onConfirm,
  deleting,
}: {
  onCancel: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white"
        style={{ maxWidth: 400, padding: 24, borderRadius: 14 }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[16px] font-bold" style={{ color: '#111' }}>Delete this lead?</p>
        <p className="text-[14px] mt-2" style={{ color: '#666' }}>
          This will permanently delete this lead and its associated call recording. This action can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-2.5 mt-5">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="text-[13px] font-medium transition-colors"
            style={{ backgroundColor: '#f0f0f0', color: '#333', padding: '10px 20px', borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="text-[13px] font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#dc2626', padding: '10px 20px', borderRadius: 8 }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LeadCard({
  lead,
  agentName,
  isPending,
  onStatusChange,
  onDeleted,
  contactId,
  onAddToCRM,
}: {
  lead: LeadWithCall
  agentName: string
  isPending: boolean
  onStatusChange: (leadId: string, status: Lead['status']) => void
  onDeleted: (leadId: string) => void
  contactId?: string
  onAddToCRM?: (lead: LeadWithCall) => Promise<string | null>
}) {
  const [expanded, setExpanded] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [addingToCRM, setAddingToCRM] = useState(false)
  const [localContactId, setLocalContactId] = useState(contactId)
  const { showToast } = useToast()

  const call = lead.call
  const transcriptLines = useMemo(
    () => call ? parseTranscript(call.transcript, agentName) : [],
    [call, agentName]
  )

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowConfirm(false)
        setFadeOut(true)
        setTimeout(() => onDeleted(lead.id), 300)
        showToast('Lead deleted', 'success')
      } else {
        showToast('Failed to delete lead', 'error')
        setDeleting(false)
      }
    } catch {
      showToast('Failed to delete lead', 'error')
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="bg-white cursor-pointer px-4 py-4 md:px-6 md:py-5"
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          boxShadow: expanded ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
          opacity: fadeOut ? 0 : 1,
          transform: fadeOut ? 'scale(0.97)' : 'scale(1)',
          transition: 'opacity 0.3s, transform 0.3s, box-shadow 0.2s',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Top row: name + urgency | date */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
              {lead.name ?? 'Unknown'}
            </span>
            <SourceBadge source={lead.source} />
            <UrgencyBadge urgency={lead.urgency} />
            {localContactId ? (
              <Link
                href={`/crm/${localContactId}`}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 no-underline"
                style={{
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                <UserCheck size={11} /> Returning Customer
              </Link>
            ) : lead.phone ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!onAddToCRM || addingToCRM) return
                  setAddingToCRM(true)
                  const newId = await onAddToCRM(lead)
                  if (newId) setLocalContactId(newId)
                  setAddingToCRM(false)
                }}
                disabled={addingToCRM}
                className="inline-flex items-center gap-1"
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {addingToCRM ? '...' : <><UserPlus size={11} /> Add to CRM</>}
              </button>
            ) : (
              <span
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                New Caller
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>
            {formatDate(lead.created_at)}
          </span>
        </div>

        {/* Contact info */}
        <div className="flex items-center gap-4 flex-wrap mb-3">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              onClick={e => e.stopPropagation()}
              style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none' }}
            >
              <Phone size={13} className="inline mr-1" />{formatPhone(lead.phone)}
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              onClick={e => e.stopPropagation()}
              style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none' }}
            >
              <Mail size={13} className="inline mr-1" />{lead.email}
            </a>
          )}
        </div>

        {/* Service interested */}
        {lead.service_interested && (
          <div className="mb-3">
            <span
              style={{
                display: 'inline-block',
                backgroundColor: '#f8f5ec',
                border: '1px solid #ebe5d3',
                borderRadius: 8,
                padding: '4px 10px',
              }}
            >
              <span style={{ fontSize: 12, color: '#92700a' }}>Interested in: </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6b5300' }}>
                {lead.service_interested}
              </span>
            </span>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div
            className="mb-3"
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              color: '#555',
              lineHeight: 1.6,
            }}
          >
            {lead.notes}
          </div>
        )}

        {/* Status buttons */}
        <div
          style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, marginTop: 4 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_BUTTONS.map((btn) => {
              const isActive = lead.status === btn.value
              return (
                <button
                  key={btn.value}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isActive) onStatusChange(lead.id, btn.value)
                  }}
                  disabled={isPending && isActive}
                  className="text-sm font-medium transition-colors"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: isActive ? 'none' : '1px solid #e5e7eb',
                    backgroundColor: isActive ? btn.activeColor : '#fff',
                    color: isActive ? '#fff' : '#666',
                    cursor: isActive ? 'default' : 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              )
            })}
          </div>
          <span style={{ fontSize: 12, color: '#ccc' }} className="hidden md:inline">
            {expanded ? 'Click to collapse' : 'Click for details'}
          </span>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            {lead.source === 'website' ? (
              <>
                {/* Website lead — show message instead of transcript */}
                {lead.notes && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">Message</p>
                    <div
                      className="rounded-xl border border-gray-200 bg-[#f9fafb] p-4 text-[13px] text-[#333] leading-[1.6] whitespace-pre-wrap"
                    >
                      {lead.notes}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#999]">
                    <Globe size={13} />
                    Submitted via website form
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowConfirm(true) }}
                    className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
                    style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </>
            ) : call ? (
              <>
                {/* Call Summary */}
                {call.summary && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">Call Summary</p>
                    <p className="text-[14px] text-[#555] leading-[1.6]">{call.summary}</p>
                  </div>
                )}

                {/* Transcript */}
                {transcriptLines.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">Transcript</p>
                    <div
                      className="rounded-xl border border-gray-200 bg-[#f9fafb] p-4 space-y-3 overflow-y-auto"
                      style={{ maxHeight: 280 }}
                    >
                      {transcriptLines.map((line, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={
                              line.speaker !== 'Caller'
                                ? { backgroundColor: '#FFD700', color: '#111' }
                                : { backgroundColor: '#e5e7eb', color: '#555' }
                            }
                          >
                            {line.speaker !== 'Caller' ? agentName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-[#888]">
                              {line.speaker !== 'Caller' ? `${agentName} (AI)` : 'Caller'}
                            </p>
                            <p className="text-[13px] text-[#333] leading-[1.5]">{line.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback raw transcript */}
                {transcriptLines.length === 0 && call.transcript && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">Transcript</p>
                    <div
                      className="rounded-xl border border-gray-200 bg-[#f9fafb] p-4 overflow-y-auto text-[13px] text-[#333] leading-[1.6] whitespace-pre-wrap"
                      style={{ maxHeight: 280 }}
                    >
                      {call.transcript}
                    </div>
                  </div>
                )}

                {/* Listen to call + Delete row */}
                <div className="flex items-center justify-between">
                  <Link
                    href="/calls"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-2 text-[14px] font-semibold no-underline"
                    style={{
                      backgroundColor: '#FFD700',
                      color: '#111',
                      borderRadius: 14,
                      padding: '10px 20px',
                    }}
                  >
                    <Headphones size={16} />
                    Listen to call
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowConfirm(true) }}
                    className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
                    style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[#999]">No call data available for this lead.</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowConfirm(true) }}
                  className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
                  style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </>
  )
}

export function LeadsCards({ clientId, initialLeads, agentName = 'Your receptionist', contactMap = {} }: LeadsCardsProps) {
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [optimisticLeads, updateOptimistic] = useOptimistic(
    initialLeads,
    (state: LeadWithCall[], update: { type: 'status'; leadId: string; status: Lead['status'] } | { type: 'delete'; leadId: string }) => {
      if (update.type === 'delete') {
        return state.filter(l => l.id !== update.leadId)
      }
      return state.map((l) => (l.id === update.leadId ? { ...l, status: update.status } : l))
    }
  )
  const { showToast } = useToast()

  // Compute counts and apply filters in a single pass
  const { counts, filtered } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const c: Record<StatusFilter, number> = { all: 0, new: 0, contacted: 0, booked: 0, lost: 0 }
    const f: LeadWithCall[] = []

    for (const lead of optimisticLeads) {
      c.all++
      if (lead.status in c) {
        c[lead.status as StatusFilter]++
      }

      // Apply tab filter
      if (activeTab !== 'all' && lead.status !== activeTab) continue

      // Apply search filter
      if (q) {
        const nameMatch = lead.name?.toLowerCase().includes(q)
        const phoneMatch = lead.phone?.includes(q)
        if (!nameMatch && !phoneMatch) continue
      }

      f.push(lead)
    }

    return { counts: c, filtered: f }
  }, [optimisticLeads, activeTab, searchQuery])

  function handleStatusChange(leadId: string, status: Lead['status']) {
    startTransition(async () => {
      updateOptimistic({ type: 'status', leadId, status })
      try {
        await updateLeadStatus(leadId, status, clientId)
        showToast(`Lead marked as ${status}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update'
        showToast(msg, 'error')
      }
    })
  }

  const handleDelete = useCallback((leadId: string) => {
    startTransition(() => {
      updateOptimistic({ type: 'delete', leadId })
    })
  }, [startTransition, updateOptimistic])

  const handleAddToCRM = useCallback(async (lead: LeadWithCall): Promise<string | null> => {
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name || 'Unknown',
          phone: lead.phone || '',
          email: lead.email || '',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        showToast('Contact added to CRM')
        return data.id
      }
      showToast('Failed to add contact', 'error')
    } catch {
      showToast('Failed to add contact', 'error')
    }
    return null
  }, [showToast])

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: '#999' }}
        />
        <input
          type="text"
          placeholder="Search by name or phone number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-[14px] outline-none"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            padding: '14px 16px 14px 44px',
            color: '#333',
          }}
        />
      </div>

      {/* Status tabs */}
      <div style={{ borderBottom: '2px solid #e5e7eb' }} className="flex overflow-x-auto mb-6 -mx-4 px-4 md:mx-0 md:px-0">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium shrink-0 transition-colors"
              style={{
                borderBottom: isActive ? '2px solid #FFD700' : '2px solid transparent',
                marginBottom: -2,
                color: isActive ? '#111' : '#888',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
              <span
                style={{
                  backgroundColor: isActive ? '#FFD700' : '#f0f0f0',
                  color: isActive ? '#111' : '#666',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: 10,
                }}
              >
                {counts[tab.value]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Cards or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Target size={32} className="text-[#ccc] mx-auto mb-3" />
          {optimisticLeads.length === 0 ? (
            <>
              <p className="text-base font-medium text-gray-700">No leads yet</p>
              <p className="text-sm mt-1" style={{ color: '#999' }}>
                When someone calls and shows interest, {agentName} will capture their info here automatically.
              </p>
            </>
          ) : searchQuery ? (
            <>
              <p className="text-base font-medium text-gray-700">No leads match your search</p>
              <p className="text-sm mt-1" style={{ color: '#999' }}>
                Try a different name or phone number.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-gray-700">
                No {activeTab} leads
              </p>
              <p className="text-sm mt-1" style={{ color: '#999' }}>
                Try checking a different status tab.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 12 }}>
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              agentName={agentName}
              isPending={isPending}
              onStatusChange={handleStatusChange}
              onDeleted={handleDelete}
              contactId={lead.phone ? contactMap[lead.phone] : undefined}
              onAddToCRM={handleAddToCRM}
            />
          ))}
        </div>
      )}
    </div>
  )
}
