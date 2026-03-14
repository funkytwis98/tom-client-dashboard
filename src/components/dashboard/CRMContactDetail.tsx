'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, StickyNote, PhoneCall,
  ChevronDown, ChevronRight, Plus, X, Save, Trash2, Target,
} from 'lucide-react'
import { useToast } from '@/components/dashboard/Toast'
import type { ContactRecord, ContactNote, ContactCustomField, ContactCustomValue } from '@/types/domain'

interface Props {
  contactId: string
  clientId: string
  agentName: string
  ownerName: string
}

interface CallItem {
  id: string
  caller_number: string | null
  caller_name: string | null
  status: string
  duration_seconds: number | null
  summary: string | null
  sentiment: string | null
  created_at: string
}

interface LeadItem {
  id: string
  name: string | null
  phone: string | null
  status: string
  service_interested: string | null
  urgency: string
  created_at: string
}

interface ActivityItem {
  type: 'call' | 'lead' | 'note'
  date: string
  summary: string
  detail?: string
  id: string
}

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name[0].toUpperCase()
}

// ---- Collapsible Section ----
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#999' }}>{title}</span>
        {open ? <ChevronDown size={14} style={{ color: '#999' }} /> : <ChevronRight size={14} style={{ color: '#999' }} />}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

// ---- Editable Field ----
function EditableField({ label, value, onSave, type = 'text' }: {
  label: string
  value: string
  onSave: (v: string) => void
  type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    return (
      <div className="mb-3">
        <label className="text-[11px] font-medium text-gray-400">{label}</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            type={type}
            className="flex-1 text-sm outline-none"
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}
            autoFocus
          />
          <button
            onClick={() => { onSave(draft); setEditing(false) }}
            className="flex items-center gap-1 text-xs font-bold"
            style={{ backgroundColor: '#FFD700', color: '#111', padding: '6px 12px', borderRadius: 6 }}
          >
            <Save size={12} /> Save
          </button>
          <button onClick={() => { setDraft(value); setEditing(false) }}>
            <X size={14} style={{ color: '#999' }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="mb-3 cursor-pointer group"
      onClick={() => { setDraft(value); setEditing(true) }}
    >
      <label className="text-[11px] font-medium text-gray-400">{label}</label>
      <p className="text-sm text-gray-800 mt-0.5 group-hover:text-[#2563eb] transition-colors">
        {value || <span className="text-gray-300 italic">Click to add</span>}
      </p>
    </div>
  )
}

// ---- Activity Dot ----
function ActivityDot({ type }: { type: 'call' | 'lead' | 'note' }) {
  const colors = { call: '#16a34a', lead: '#d97706', note: '#2563eb' }
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
      style={{ backgroundColor: colors[type] }}
    />
  )
}

// ---- Main Component ----
export function CRMContactDetail({ contactId, agentName }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [customFields, setCustomFields] = useState<ContactCustomField[]>([])
  const [customValues, setCustomValues] = useState<ContactCustomValue[]>([])
  const [calls, setCalls] = useState<CallItem[]>([])
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'activities'>('overview')
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')
  const [newFieldSection, setNewFieldSection] = useState('Custom')

  // Fetch data
  useEffect(() => {
    async function load() {
      const [detailRes, fieldsRes] = await Promise.all([
        fetch(`/api/crm/contacts/${contactId}`),
        fetch('/api/crm/custom-fields'),
      ])
      if (detailRes.ok) {
        const data = await detailRes.json()
        setContact(data.contact)
        setNotes(data.notes)
        setCustomValues(data.customValues)
        setCalls(data.calls)
        setLeads(data.leads)
      }
      if (fieldsRes.ok) {
        setCustomFields(await fieldsRes.json())
      }
      setLoading(false)
    }
    load()
  }, [contactId])

  // Build activity timeline
  const activities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = []
    for (const c of calls) {
      items.push({
        type: 'call',
        date: c.created_at,
        summary: c.summary || `Call (${c.status})`,
        detail: c.duration_seconds ? `${Math.round(c.duration_seconds / 60)}m${c.sentiment ? ` - ${c.sentiment}` : ''}` : undefined,
        id: c.id,
      })
    }
    for (const l of leads) {
      items.push({
        type: 'lead',
        date: l.created_at,
        summary: l.service_interested ? `Interested in ${l.service_interested}` : `Lead (${l.status})`,
        detail: l.urgency,
        id: l.id,
      })
    }
    for (const n of notes) {
      items.push({
        type: 'note',
        date: n.created_at,
        summary: n.text,
        detail: n.author,
        id: n.id,
      })
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items
  }, [calls, leads, notes])

  const updateField = useCallback(async (field: string, value: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setContact(updated)
      showToast('Updated')
    } else {
      showToast('Failed to update', 'error')
    }
  }, [contactId, showToast])

  async function handleSaveNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteText.trim() }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setNoteText('')
      showToast('Note added')
    } else {
      showToast('Failed to add note', 'error')
    }
    setSavingNote(false)
  }

  async function handleUpdateCustomValue(fieldId: string, value: string) {
    const res = await fetch(`/api/crm/contacts/${contactId}/custom-values`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldId]: value }),
    })
    if (res.ok) {
      setCustomValues(prev => {
        const exists = prev.find(v => v.field_id === fieldId)
        if (exists) return prev.map(v => v.field_id === fieldId ? { ...v, value } : v)
        return [...prev, { id: '', contact_id: contactId, field_id: fieldId, value, created_at: '', updated_at: '' }]
      })
      showToast('Updated')
    }
  }

  async function handleAddCustomField() {
    if (!newFieldName.trim()) return
    const res = await fetch('/api/crm/custom-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: newFieldName.trim(), field_type: newFieldType, section_name: newFieldSection }),
    })
    if (res.ok) {
      const field = await res.json()
      setCustomFields(prev => [...prev, field])
      setNewFieldName('')
      setShowAddField(false)
      showToast('Custom field added')
    }
  }

  async function handleDeleteCustomField(fieldId: string) {
    const res = await fetch(`/api/crm/custom-fields?id=${fieldId}`, { method: 'DELETE' })
    if (res.ok) {
      setCustomFields(prev => prev.filter(f => f.id !== fieldId))
      setCustomValues(prev => prev.filter(v => v.field_id !== fieldId))
      showToast('Field deleted')
    }
  }

  async function handleAddTag(tag: string) {
    if (!contact || !tag.trim()) return
    const newTags = [...(contact.tags || []), tag.trim()]
    await updateField('tags', newTags as unknown as string)
  }

  async function handleRemoveTag(tag: string) {
    if (!contact) return
    const newTags = (contact.tags || []).filter(t => t !== tag)
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
    if (res.ok) {
      setContact(await res.json())
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading...</div>
  }

  if (!contact) {
    return <div className="p-8 text-center text-gray-400">Contact not found</div>
  }

  // Group custom fields by section
  const fieldsBySection = new Map<string, ContactCustomField[]>()
  for (const f of customFields) {
    const list = fieldsBySection.get(f.section_name) || []
    list.push(f)
    fieldsBySection.set(f.section_name, list)
  }

  const customValueMap = new Map(customValues.map(v => [v.field_id, v.value]))

  return (
    <div>
      {/* Back link */}
      <div className="px-5 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <button
          onClick={() => router.push('/crm')}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: '#2563eb' }}
        >
          <ArrowLeft size={16} /> Contacts
        </button>
      </div>

      {/* Header */}
      <div className="bg-white px-5 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-start gap-4 mb-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FFD700' }}
          >
            <span className="text-lg font-bold" style={{ color: '#111' }}>
              {getInitials(contact.name)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{contact.name || 'Unknown'}</h1>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="text-sm no-underline" style={{ color: '#2563eb' }}>
                  <Phone size={13} className="inline mr-1" />{formatPhone(contact.phone)}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-sm no-underline" style={{ color: '#2563eb' }}>
                  <Mail size={13} className="inline mr-1" />{contact.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => { setActiveTab('overview'); setTimeout(() => document.getElementById('note-input')?.focus(), 100) }}
            className="flex flex-col items-center gap-1 text-[11px] font-medium text-gray-600 transition-colors hover:text-gray-900"
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px' }}
          >
            <StickyNote size={16} /> Note
          </button>
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex flex-col items-center gap-1 text-[11px] font-medium text-gray-600 no-underline transition-colors hover:text-gray-900"
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px' }}
            >
              <Mail size={16} /> Email
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex flex-col items-center gap-1 text-[11px] font-medium text-gray-600 no-underline transition-colors hover:text-gray-900"
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px' }}
            >
              <PhoneCall size={16} /> Call
            </a>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(contact.tags || []).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs"
              style={{
                backgroundColor: '#f0f9ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid #bfdbfe',
              }}
            >
              {tag.replace(/_/g, ' ')}
              <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:opacity-70">
                <X size={10} />
              </button>
            </span>
          ))}
          <AddTagButton onAdd={handleAddTag} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row">
        {/* Left column — fields */}
        <div className="md:w-[360px] bg-white flex-shrink-0" style={{ borderRight: '1px solid #e5e7eb' }}>
          <Section title="Contact Info">
            <EditableField label="Preferred Contact" value={contact.preferred_contact} onSave={v => updateField('preferred_contact', v)} />
            <EditableField label="Birthday" value={contact.birthday} onSave={v => updateField('birthday', v)} type="date" />
          </Section>

          <Section title="Vehicle Info">
            <EditableField label="Make" value={contact.vehicle_make} onSave={v => updateField('vehicle_make', v)} />
            <EditableField label="Model" value={contact.vehicle_model} onSave={v => updateField('vehicle_model', v)} />
            <EditableField label="Year" value={contact.vehicle_year} onSave={v => updateField('vehicle_year', v)} />
          </Section>

          <Section title="Tire Info">
            <EditableField label="Tire Size" value={contact.tire_size} onSave={v => updateField('tire_size', v)} />
          </Section>

          {/* Custom field sections */}
          {Array.from(fieldsBySection.entries()).map(([sectionName, fields]) => (
            <Section key={sectionName} title={sectionName}>
              {fields.map(field => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <EditableField
                      label={field.field_name}
                      value={customValueMap.get(field.id) || ''}
                      onSave={v => handleUpdateCustomValue(field.id, v)}
                      type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteCustomField(field.id)}
                    className="mt-4 opacity-0 group-hover:opacity-100 hover:opacity-80"
                    title="Delete field"
                  >
                    <Trash2 size={12} style={{ color: '#dc2626' }} />
                  </button>
                </div>
              ))}
            </Section>
          ))}

          {/* Add custom field */}
          <div className="px-5 py-4">
            {showAddField ? (
              <div className="space-y-2">
                <input
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                  placeholder="Field name"
                  className="w-full text-sm outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <select
                    value={newFieldType}
                    onChange={e => setNewFieldType(e.target.value)}
                    className="text-sm flex-1"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                  <input
                    value={newFieldSection}
                    onChange={e => setNewFieldSection(e.target.value)}
                    placeholder="Section"
                    className="text-sm flex-1 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustomField}
                    className="text-xs font-bold"
                    style={{ backgroundColor: '#FFD700', color: '#111', padding: '6px 14px', borderRadius: 6 }}
                  >
                    Add Field
                  </button>
                  <button
                    onClick={() => setShowAddField(false)}
                    className="text-xs text-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddField(true)}
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: '#2563eb', border: '1px dashed #bfdbfe', borderRadius: 6, padding: '6px 12px' }}
              >
                <Plus size={12} /> Add custom field
              </button>
            )}
          </div>
        </div>

        {/* Right column — overview/activities */}
        <div className="flex-1" style={{ backgroundColor: '#fafafa' }}>
          {/* Sub-tabs */}
          <div className="flex bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
            {(['overview', 'activities'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-3 text-sm font-medium capitalize"
                style={{
                  borderBottom: activeTab === tab ? '2px solid #FFD700' : '2px solid transparent',
                  color: activeTab === tab ? '#111' : '#888',
                  fontWeight: activeTab === tab ? 700 : 500,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'overview' ? (
              <>
                {/* Stats */}
                <div
                  className="bg-white grid grid-cols-3 gap-4 mb-5"
                  style={{ borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>Interactions</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{contact.interaction_count}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>First Contact</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(contact.first_contact_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>Last Active</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{contact.last_interaction_at ? formatDate(contact.last_interaction_at) : '--'}</p>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#999' }}>Notes</p>
                  <div className="mb-3">
                    <textarea
                      id="note-input"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full text-sm outline-none resize-none"
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        padding: '12px 14px',
                        minHeight: 80,
                      }}
                    />
                    {noteText.trim() && (
                      <button
                        onClick={handleSaveNote}
                        disabled={savingNote}
                        className="mt-2 text-sm font-bold disabled:opacity-50"
                        style={{ backgroundColor: '#FFD700', color: '#111', padding: '8px 18px', borderRadius: 8 }}
                      >
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                    )}
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-400">No notes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map(note => (
                        <div
                          key={note.id}
                          className="bg-white"
                          style={{ borderRadius: 10, border: '1px solid #e5e7eb', padding: '12px 14px' }}
                        >
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
                          <p className="text-[11px] mt-2" style={{ color: '#999' }}>
                            {note.author === 'AI' ? `${agentName} (AI)` : note.author} &middot; {formatDateTime(note.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity (last 5) */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#999' }}>Recent Activity</p>
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-400">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.slice(0, 5).map(a => (
                        <div key={`${a.type}-${a.id}`} className="flex items-start gap-3">
                          <ActivityDot type={a.type} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 truncate">{a.summary}</p>
                            <p className="text-[11px]" style={{ color: '#999' }}>
                              {a.type === 'call' ? 'Call' : a.type === 'lead' ? 'Lead' : 'Note'} &middot; {formatDateTime(a.date)}
                              {a.detail ? ` &middot; ${a.detail}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Activities tab — full timeline */
              <div>
                {activities.length === 0 ? (
                  <div className="text-center py-12">
                    <Target size={28} style={{ color: '#ccc' }} className="mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No interactions recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map(a => (
                      <div
                        key={`${a.type}-${a.id}`}
                        className="flex items-start gap-3 bg-white"
                        style={{ borderRadius: 10, border: '1px solid #e5e7eb', padding: '12px 14px' }}
                      >
                        <ActivityDot type={a.type} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] font-semibold uppercase"
                              style={{
                                color: a.type === 'call' ? '#16a34a' : a.type === 'lead' ? '#d97706' : '#2563eb',
                              }}
                            >
                              {a.type}
                            </span>
                            <span className="text-[11px]" style={{ color: '#999' }}>{formatDateTime(a.date)}</span>
                          </div>
                          <p className="text-sm text-gray-800">{a.summary}</p>
                          {a.detail && <p className="text-[11px] mt-1" style={{ color: '#999' }}>{a.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Add Tag inline ----
function AddTagButton({ onAdd }: { onAdd: (tag: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="text-xs font-medium"
        style={{ color: '#2563eb', border: '1px dashed #bfdbfe', borderRadius: 6, padding: '2px 8px' }}
      >
        + Add tag
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) {
            onAdd(value.trim())
            setValue('')
            setAdding(false)
          }
          if (e.key === 'Escape') { setValue(''); setAdding(false) }
        }}
        className="text-xs outline-none"
        style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 6px', width: 100 }}
        placeholder="Tag name"
        autoFocus
      />
      <button onClick={() => { setValue(''); setAdding(false) }}>
        <X size={10} style={{ color: '#999' }} />
      </button>
    </span>
  )
}
