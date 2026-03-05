'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, X, Check } from 'lucide-react'
import { createCustomer, deleteCustomer } from '@/app/actions/customers'
import type { Customer } from '@/types/domain'

interface CustomerListProps {
  clientId: string
  initialCustomers: Customer[]
}

type StatusFilter = 'all' | Customer['status']

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'vip', label: 'VIP' },
  { value: 'inactive', label: 'Inactive' },
]

const STATUS_BADGE: Record<Customer['status'], { label: string; className: string }> = {
  active:   { label: 'Active',   className: 'bg-green-100 text-green-800' },
  vip:      { label: 'VIP',      className: 'bg-purple-100 text-purple-800' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700' },
}

const SOURCE_BADGE: Record<Customer['source'], { label: string; className: string }> = {
  manual:         { label: 'Manual',    className: 'bg-blue-100 text-blue-800' },
  auto_converted: { label: 'From Lead', className: 'bg-indigo-100 text-indigo-800' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CustomerList({ clientId, initialCustomers }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = customers.filter((c) => {
    if (activeTab !== 'all' && c.status !== activeTab) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      )
    }
    return true
  })

  function handleDelete(customer: Customer) {
    if (!confirm(`Deactivate "${customer.name}"?`)) return
    startTransition(async () => {
      try {
        await deleteCustomer(customer.id, clientId)
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, status: 'inactive' as const } : c))
        )
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to deactivate customer')
      }
    })
  }

  function handleCreated(customer: Customer) {
    setCustomers((prev) => [customer, ...prev])
    setShowAddForm(false)
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 text-sm font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Search + Add */}
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {!showAddForm && (
          <button
            onClick={() => { setShowAddForm(true); setActionError(null) }}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <CustomerAddForm
          clientId={clientId}
          onCreated={handleCreated}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'all'
              ? customers.length
              : customers.filter((c) => c.status === tab.value).length
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-gray-400">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No customers found</p>
          <p className="text-xs text-gray-400 mt-1">
            Customers are auto-created when leads are booked, or add them manually
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Tags</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Source</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Calls</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Added</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((customer) => {
                const statusBadge = STATUS_BADGE[customer.status]
                const sourceBadge = SOURCE_BADGE[customer.source]
                return (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/clients/${clientId}/customers/${customer.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{customer.phone ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[180px] truncate">{customer.email ?? '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {tag}
                          </span>
                        ))}
                        {customer.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{customer.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceBadge.className}`}>
                        {sourceBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{customer.total_calls}</td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(customer.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/clients/${clientId}/customers/${customer.id}`}
                          className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          View
                        </Link>
                        {customer.status !== 'inactive' && (
                          <button
                            onClick={() => handleDelete(customer)}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Inline Add Form ---

interface CustomerAddFormProps {
  clientId: string
  onCreated: (customer: Customer) => void
  onCancel: () => void
}

function CustomerAddForm({ clientId, onCreated, onCancel }: CustomerAddFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<Customer['status']>('active')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setError(null)

    startTransition(async () => {
      try {
        const result = await createCustomer({
          client_id: clientId,
          name: name.trim(),
          phone,
          email,
          notes,
          tags,
          status,
        })
        onCreated(result.customer)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create customer')
      }
    })
  }

  return (
    <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm font-semibold text-indigo-800 mb-3">New Customer</p>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tire-installation, fleet"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Customer['status'])}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="active">Active</option>
            <option value="vip">VIP</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this customer..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}
