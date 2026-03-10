'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { updateLeadStatus, convertLeadToCustomer } from '@/app/actions/leads'
import { useToast } from '@/components/dashboard/Toast'
import type { Lead } from '@/types/domain'

interface LeadsPipelineProps {
  clientId: string
  initialLeads: Lead[]
  convertedLeadIds?: string[]
}

type StatusFilter = 'all' | Lead['status']

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
]

const URGENCY_BADGE: Record<Lead['urgency'], { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
  high:   { label: 'High',   className: 'bg-orange-100 text-orange-800' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  low:    { label: 'Low',    className: 'bg-gray-100 text-gray-700' },
}

const STATUS_BADGE: Record<Lead['status'], { label: string; className: string }> = {
  new:       { label: 'New',       className: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacted', className: 'bg-purple-100 text-purple-800' },
  booked:    { label: 'Booked',    className: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700' },
  lost:      { label: 'Lost',      className: 'bg-red-100 text-red-800' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const LEADS_PAGE_SIZE = 10

export function LeadsPipeline({ clientId, initialLeads, convertedLeadIds = [] }: LeadsPipelineProps) {
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [visibleCount, setVisibleCount] = useState(LEADS_PAGE_SIZE)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [convertedIds, setConvertedIds] = useState<Set<string>>(() => new Set(convertedLeadIds))
  const [optimisticLeads, updateOptimistic] = useOptimistic(
    initialLeads,
    (state: Lead[], { leadId, status }: { leadId: string; status: Lead['status'] }) =>
      state.map((l) => (l.id === leadId ? { ...l, status } : l))
  )

  const { showToast } = useToast()

  function handleConvert(leadId: string) {
    startTransition(async () => {
      setActionError(null)
      try {
        const result = await convertLeadToCustomer(leadId, clientId)
        if (result.converted) {
          setConvertedIds((prev) => new Set(prev).add(leadId))
          showToast('Lead converted to customer')
        } else if (result.customerId) {
          setConvertedIds((prev) => new Set(prev).add(leadId))
          showToast('Customer already exists for this lead')
        } else {
          showToast('Could not convert lead', 'error')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Conversion failed'
        setActionError(msg)
        showToast(msg, 'error')
      }
    })
  }

  function handleStatusChange(leadId: string, status: Lead['status']) {
    startTransition(async () => {
      setActionError(null)
      updateOptimistic({ leadId, status })
      try {
        await updateLeadStatus(leadId, status, clientId)
        showToast(`Lead marked as ${status}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update lead status'
        setActionError(msg)
        showToast(msg, 'error')
      }
    })
  }

  const filtered =
    activeTab === 'all'
      ? optimisticLeads
      : optimisticLeads.filter((l) => l.status === activeTab)

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        {optimisticLeads.length} {optimisticLeads.length === 1 ? 'lead' : 'leads'}
      </p>
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-600 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'all'
              ? optimisticLeads.length
              : optimisticLeads.filter((l) => l.status === tab.value).length
          return (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setVisibleCount(LEADS_PAGE_SIZE); }}
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

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No leads found</p>
          <p className="text-xs text-gray-400 mt-1">
            Leads are extracted automatically from incoming calls
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Service</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Urgency</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((lead) => {
                const urgencyBadge = URGENCY_BADGE[lead.urgency]
                const statusBadge = STATUS_BADGE[lead.status]
                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {lead.name ?? 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{lead.phone ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[180px] truncate">
                      {lead.service_interested ?? '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${urgencyBadge.className}`}
                      >
                        {urgencyBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {(lead.status === 'new') && (
                          <button
                            onClick={() => handleStatusChange(lead.id, 'contacted')}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
                          >
                            Contacted
                          </button>
                        )}
                        {(lead.status === 'new' || lead.status === 'contacted') && (
                          <button
                            onClick={() => handleStatusChange(lead.id, 'booked')}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            Booked
                          </button>
                        )}
                        {(lead.status === 'new' || lead.status === 'contacted') && (
                          <button
                            onClick={() => handleStatusChange(lead.id, 'lost')}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            Lost
                          </button>
                        )}
                        {lead.status === 'booked' && (
                          <button
                            onClick={() => handleStatusChange(lead.id, 'completed')}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          >
                            Completed
                          </button>
                        )}
                        {convertedIds.has(lead.id) ? (
                          <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
                            Converted
                          </span>
                        ) : (lead.status === 'booked' || lead.status === 'completed') && (
                          <button
                            onClick={() => handleConvert(lead.id)}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors font-medium"
                          >
                            Convert to Customer
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

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount((n) => n + LEADS_PAGE_SIZE)}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
