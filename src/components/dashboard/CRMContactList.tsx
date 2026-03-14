'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, User } from 'lucide-react'
import type { ContactRecord } from '@/types/domain'
import { useToast } from '@/components/dashboard/Toast'

interface Props {
  initialContacts: ContactRecord[]
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

function formatDate(iso: string | null): string {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name[0].toUpperCase()
}

function getVehicle(c: ContactRecord): string {
  const parts = [c.vehicle_year, c.vehicle_make, c.vehicle_model].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '--'
}

function CreateContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ContactRecord) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data)
        showToast('Contact created')
      } else {
        showToast('Failed to create contact', 'error')
      }
    } catch {
      showToast('Failed to create contact', 'error')
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md"
        style={{ borderRadius: 14, padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-lg font-bold text-gray-900 mb-5">Create Contact</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full mt-1 text-sm outline-none"
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full mt-1 text-sm outline-none"
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 text-sm outline-none"
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}
              placeholder="email@example.com"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm font-medium"
            style={{ backgroundColor: '#f0f0f0', color: '#333', padding: '10px 20px', borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: '#FFD700', color: '#111', padding: '10px 20px', borderRadius: 8 }}
          >
            {saving ? 'Creating...' : 'Create Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CRMContactList({ initialContacts }: Props) {
  const [contacts, setContacts] = useState(initialContacts)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const router = useRouter()

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return contacts
    return contacts.filter(c => {
      const nameMatch = c.name?.toLowerCase().includes(q)
      const phoneMatch = c.phone?.includes(q)
      return nameMatch || phoneMatch
    })
  }, [contacts, searchQuery])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-sm font-bold"
          style={{
            backgroundColor: '#FFD700',
            color: '#111',
            padding: '10px 20px',
            borderRadius: 10,
          }}
        >
          <Plus size={16} />
          Create contact
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
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
          className="w-full text-sm outline-none"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            padding: '14px 16px 14px 44px',
            color: '#333',
          }}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <User size={32} className="mx-auto mb-3" style={{ color: '#ccc' }} />
          {contacts.length === 0 ? (
            <>
              <p className="text-base font-medium text-gray-700">No contacts yet</p>
              <p className="text-sm mt-1" style={{ color: '#999' }}>
                Contacts are automatically created when callers are added from the Leads tab.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-gray-700">No contacts match your search</p>
              <p className="text-sm mt-1" style={{ color: '#999' }}>Try a different name or phone number.</p>
            </>
          )}
        </div>
      ) : (
        <div
          className="bg-white overflow-hidden"
          style={{
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Table header */}
          <div
            className="grid items-center px-5 py-3 grid-cols-[2fr_1.5fr] md:grid-cols-[2fr_1.5fr_1.5fr_1fr]"
            style={{
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>Name</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>Phone Number</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden md:block" style={{ color: '#999' }}>Vehicle</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden md:block text-right" style={{ color: '#999' }}>Last Contact</span>
          </div>

          {/* Rows */}
          {filtered.map(contact => (
            <div
              key={contact.id}
              className="grid items-center px-5 py-3.5 cursor-pointer transition-colors grid-cols-[2fr_1.5fr] md:grid-cols-[2fr_1.5fr_1.5fr_1fr]"
              style={{
                borderBottom: '1px solid #f0f0f0',
              }}
              onClick={() => router.push(`/crm/${contact.id}`)}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {/* Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#FFD700' }}
                >
                  <span className="text-xs font-bold" style={{ color: '#111' }}>
                    {getInitials(contact.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: '#2563eb' }}
                  >
                    {contact.name || 'Unknown'}
                  </p>
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {contact.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px]"
                          style={{
                            backgroundColor: '#f0f9ff',
                            color: '#2563eb',
                            padding: '1px 6px',
                            borderRadius: 4,
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <span className="text-sm" style={{ color: '#2563eb' }}>
                {contact.phone ? formatPhone(contact.phone) : '--'}
              </span>

              {/* Vehicle */}
              <span className="text-sm text-gray-600 hidden md:block truncate">
                {getVehicle(contact)}
              </span>

              {/* Last Contact */}
              <span className="text-sm text-gray-500 hidden md:block text-right">
                {formatDate(contact.last_interaction_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateContactModal
          onClose={() => setShowCreate(false)}
          onCreated={c => {
            setContacts(prev => [c, ...prev])
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}
