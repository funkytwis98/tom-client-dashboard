'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/dashboard/EmptyState'
import type { Call } from '@/types/domain'

interface AgencyCallsTableProps {
  initialCalls: Call[]
  clientMap: Record<string, string>
  totalCount: number
  filters: { direction?: string; status?: string; client?: string }
}

const PAGE_SIZE = 10

const DIRECTION_BADGE: Record<string, { label: string; className: string }> = {
  inbound:  { label: 'Inbound',  className: 'bg-blue-100 text-blue-800' },
  outbound: { label: 'Outbound', className: 'bg-purple-100 text-purple-800' },
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  completed:   { label: 'Completed',   className: 'bg-green-100 text-green-800' },
  missed:      { label: 'Missed',      className: 'bg-red-100 text-red-800' },
  voicemail:   { label: 'Voicemail',   className: 'bg-yellow-100 text-yellow-800' },
  transferred: { label: 'Transferred', className: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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

export function AgencyCallsTable({ initialCalls, clientMap, totalCount, filters }: AgencyCallsTableProps) {
  const [calls, setCalls] = useState<Call[]>(initialCalls)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    if (calls.length === 0) return
    setLoading(true)
    try {
      const supabase = createClient()
      const lastCall = calls[calls.length - 1]
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .lt('created_at', lastCall.created_at)
        .limit(PAGE_SIZE)

      if (filters.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction)
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.client && filters.client !== 'all') {
        query = query.eq('client_id', filters.client)
      }

      const { data } = await query
      if (data && data.length > 0) {
        setCalls((prev) => [...prev, ...(data as Call[])])
      }
    } finally {
      setLoading(false)
    }
  }

  const hasMore = calls.length < totalCount

  return (
    <>
      <p className="text-sm text-gray-500 mb-3">
        {totalCount} {totalCount === 1 ? 'call' : 'calls'}
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {calls.length === 0 ? (
          <EmptyState
            icon={<Phone className="h-12 w-12" />}
            title="No calls yet"
            description="When customers call your business, their calls will appear here with transcripts and summaries."
          />
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caller</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calls.map((call) => {
                  const dir = DIRECTION_BADGE[call.direction]
                  const st = STATUS_BADGE[call.status] ?? { label: call.status, className: 'bg-gray-100 text-gray-800' }
                  return (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <Link href={`/clients/${call.client_id}/calls/${call.id}`} className="hover:text-gray-900">
                          {formatDate(call.created_at)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <Link href={`/clients/${call.client_id}/calls`} className="hover:text-gray-900">
                          {clientMap[call.client_id] ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dir?.className ?? 'bg-gray-100 text-gray-800'}`}>
                          {dir?.label ?? call.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {call.caller_name ?? call.caller_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {call.lead_score != null ? (
                          <span className={`font-medium ${call.lead_score >= 8 ? 'text-green-600' : call.lead_score >= 5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                            {call.lead_score}/10
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {calls.map((call) => {
              const dir = DIRECTION_BADGE[call.direction]
              const st = STATUS_BADGE[call.status] ?? { label: call.status, className: 'bg-gray-100 text-gray-800' }
              return (
                <Link key={call.id} href={`/clients/${call.client_id}/calls/${call.id}`} className="block p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {call.caller_name ?? call.caller_number ?? 'Unknown'}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${st.className}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {call.summary ?? 'No summary'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>{formatDuration(call.duration_seconds)}</span>
                      <span>{formatDate(call.created_at)}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dir?.className ?? 'bg-gray-100 text-gray-800'}`}>
                      {dir?.label ?? call.direction}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          </>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 min-h-[44px] md:min-h-0 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load more (${totalCount - calls.length} remaining)`}
          </button>
        </div>
      )}
    </>
  )
}
