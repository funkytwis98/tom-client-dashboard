'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Call } from '@/types/domain'

interface CallLogTableProps {
  clientId: string
  initialCalls: Call[]
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const DIRECTION_BADGE: Record<Call['direction'], { label: string; className: string }> = {
  inbound:  { label: 'Inbound',  className: 'bg-blue-100 text-blue-800' },
  outbound: { label: 'Outbound', className: 'bg-gray-100 text-gray-700' },
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  completed:   { label: 'Completed',   className: 'bg-green-100 text-green-800' },
  missed:      { label: 'Missed',      className: 'bg-red-100 text-red-800' },
  voicemail:   { label: 'Voicemail',   className: 'bg-yellow-100 text-yellow-800' },
  transferred: { label: 'Transferred', className: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
}

function LeadScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-gray-400 text-xs">—</span>
  const className =
    score >= 8 ? 'bg-green-100 text-green-800' :
    score >= 5 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {score}/10
    </span>
  )
}

type DirectionFilter = 'all' | 'inbound' | 'outbound'
type StatusFilter = 'all' | 'completed' | 'missed' | 'voicemail'

const PAGE_SIZE = 10

export function CallLogTable({ clientId, initialCalls }: CallLogTableProps) {
  const [calls, setCalls] = useState<Call[]>(initialCalls)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const directionFilter = (searchParams.get('direction') ?? 'all') as DirectionFilter
  const statusFilter = (searchParams.get('status') ?? 'all') as StatusFilter

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`calls:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCalls((prev) => [payload.new as Call, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCalls((prev) =>
              prev.map((c) => (c.id === (payload.new as Call).id ? (payload.new as Call) : c))
            )
          } else if (payload.eventType === 'DELETE') {
            setCalls((prev) => prev.filter((c) => c.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId])

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const filtered = calls.filter((call) => {
    if (directionFilter !== 'all' && call.direction !== directionFilter) return false
    if (statusFilter !== 'all' && call.status !== statusFilter) return false
    return true
  })

  const visible = filtered.slice(0, visibleCount)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        {filtered.length} {filtered.length === 1 ? 'call' : 'calls'}
      </p>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Direction:</span>
          {(['all', 'inbound', 'outbound'] as const).map((d) => (
            <button
              key={d}
              onClick={() => updateFilter('direction', d)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                directionFilter === d
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Status:</span>
          {(['all', 'completed', 'missed', 'voicemail'] as const).map((s) => (
            <button
              key={s}
              onClick={() => updateFilter('status', s)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
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
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No calls yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Calls will appear here automatically once your phone number is set up.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date / Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Direction</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Caller</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Lead Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((call) => {
                  const dirBadge = DIRECTION_BADGE[call.direction]
                  const statusBadge = STATUS_BADGE[call.status] ?? {
                    label: call.status,
                    className: 'bg-gray-100 text-gray-700',
                  }
                  return (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {formatDateTime(call.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dirBadge.className}`}
                        >
                          {dirBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {call.caller_name ?? call.caller_number ?? 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="py-3 px-4">
                        <LeadScoreBadge score={call.lead_score} />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/clients/${clientId}/calls/${call.id}`}
                          className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > visibleCount && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
