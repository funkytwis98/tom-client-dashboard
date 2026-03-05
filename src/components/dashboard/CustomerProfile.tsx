'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateCustomer } from '@/app/actions/customers'
import type { Customer, Call, Lead } from '@/types/domain'

interface CustomerProfileProps {
  clientId: string
  customer: Customer
  calls: unknown[]
  leads: unknown[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const STATUS_BADGE: Record<Customer['status'], { label: string; className: string }> = {
  active:   { label: 'Active',   className: 'bg-green-100 text-green-800' },
  vip:      { label: 'VIP',      className: 'bg-purple-100 text-purple-800' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700' },
}

export function CustomerProfile({ clientId, customer: initialCustomer, calls, leads }: CustomerProfileProps) {
  const [customer, setCustomer] = useState(initialCustomer)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Edit form state
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [email, setEmail] = useState(customer.email ?? '')
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [tags, setTags] = useState(customer.tags.join(', '))
  const [status, setStatus] = useState(customer.status)

  function startEdit() {
    setName(customer.name)
    setPhone(customer.phone ?? '')
    setEmail(customer.email ?? '')
    setNotes(customer.notes ?? '')
    setTags(customer.tags.join(', '))
    setStatus(customer.status)
    setEditing(true)
    setError(null)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
  }

  function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setError(null)

    startTransition(async () => {
      try {
        await updateCustomer({
          id: customer.id,
          client_id: clientId,
          name: name.trim(),
          phone,
          email,
          notes,
          tags,
          status,
        })
        const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean)
        setCustomer((c) => ({
          ...c,
          name: name.trim(),
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          tags: parsedTags,
          status,
        }))
        setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update customer')
      }
    })
  }

  const statusBadge = STATUS_BADGE[customer.status]
  const typedCalls = calls as Call[]
  const typedLeads = leads as Lead[]

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm font-medium">Dismiss</button>
        </div>
      )}

      {/* Contact Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Contact Details</h2>
          {!editing && (
            <button onClick={startEdit} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as Customer['status'])} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="active">Active</option>
                  <option value="vip">VIP</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={isPending} className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                <Check className="h-4 w-4" /> {isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={cancelEdit} disabled={isPending} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-xs font-medium text-gray-500">Name</p>
              <p className="text-sm text-gray-900 mt-0.5">{customer.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Phone</p>
              <p className="text-sm text-gray-900 mt-0.5">{customer.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Email</p>
              <p className="text-sm text-gray-900 mt-0.5">{customer.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Tags</p>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {customer.tags.length > 0 ? customer.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{tag}</span>
                )) : <span className="text-sm text-gray-400">—</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Source</p>
              <p className="text-sm text-gray-900 mt-0.5">{customer.source === 'auto_converted' ? 'From Lead' : 'Manual'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Calls</p>
              <p className="text-sm text-gray-900 mt-0.5">{customer.total_calls}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Customer Since</p>
              <p className="text-sm text-gray-900 mt-0.5">{formatDate(customer.created_at)}</p>
            </div>
            {customer.notes && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500">Notes</p>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Call History</h2>
        {typedCalls.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No calls found for this customer</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Direction</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Sentiment</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {typedCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 whitespace-nowrap">{formatDateTime(call.created_at)}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{call.direction}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {call.duration_seconds != null ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {call.sentiment ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          call.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                          call.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {call.sentiment}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-[300px] truncate">{call.summary ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Linked Leads */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Leads</h2>
        {typedLeads.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No linked leads found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Service</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Urgency</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {typedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{lead.name ?? 'Unknown'}</td>
                    <td className="py-3 px-4 text-gray-600">{lead.service_interested ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'booked' ? 'bg-green-100 text-green-800' :
                        lead.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        lead.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                        lead.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                        lead.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {lead.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
