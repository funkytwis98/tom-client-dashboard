import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientFilterSelect } from '@/components/dashboard/ClientFilterSelect'
import type { Call, Client } from '@/types/domain'

interface CallsPageProps {
  searchParams: Promise<{ direction?: string; status?: string; client?: string }>
}

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

export default async function CallsPage({ searchParams }: CallsPageProps) {
  const { direction, status, client: clientFilter } = await searchParams

  const supabase = await createClient()

  const [callsResult, clientsResult] = await Promise.all([
    (() => {
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (direction && direction !== 'all') {
        query = query.eq('direction', direction)
      }
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
      if (clientFilter && clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter)
      }
      return query
    })(),
    supabase.from('clients').select('id, name').order('name'),
  ])

  const calls: Call[] = callsResult.error ? [] : ((callsResult.data ?? []) as Call[])
  const clients: Pick<Client, 'id' | 'name'>[] = clientsResult.error
    ? []
    : ((clientsResult.data ?? []) as Pick<Client, 'id' | 'name'>[])

  const clientMap = new Map(clients.map((c) => [c.id, c.name]))

  function filterHref(params: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = {
      direction: direction ?? 'all',
      status: status ?? 'all',
      client: clientFilter ?? 'all',
      ...params,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all') sp.set(k, v)
    }
    const qs = sp.toString()
    return `/calls${qs ? `?${qs}` : ''}`
  }

  const directionFilters = [
    { value: 'all', label: 'All' },
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' },
  ]

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'completed', label: 'Completed' },
    { value: 'missed', label: 'Missed' },
    { value: 'voicemail', label: 'Voicemail' },
  ]

  const activeDirection = direction ?? 'all'
  const activeStatus = status ?? 'all'

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
        <p className="text-sm text-gray-500 mt-1">All calls across clients</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Direction */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500 mr-1">Direction:</span>
          {directionFilters.map((f) => (
            <Link
              key={f.value}
              href={filterHref({ direction: f.value })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeDirection === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
          {statusFilters.map((f) => (
            <Link
              key={f.value}
              href={filterHref({ status: f.value })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeStatus === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Client select */}
        {clients.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-500 mr-1">Client:</span>
            <ClientFilterSelect
              clients={clients}
              currentValue={clientFilter ?? 'all'}
              buildHref={(val) => filterHref({ client: val })}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {calls.length === 0 ? (
          <div className="text-center py-16">
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
            <p className="mt-3 text-sm font-medium text-gray-900">No calls found</p>
            <p className="text-xs text-gray-500 mt-1">
              Calls will appear here once your AI receptionist handles them.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Caller
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calls.map((call) => {
                const dir = DIRECTION_BADGE[call.direction]
                const st = STATUS_BADGE[call.status] ?? {
                  label: call.status,
                  className: 'bg-gray-100 text-gray-800',
                }
                return (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <Link
                        href={`/clients/${call.client_id}/calls/${call.id}`}
                        className="hover:text-indigo-600"
                      >
                        {formatDate(call.created_at)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <Link
                        href={`/clients/${call.client_id}/calls`}
                        className="hover:text-indigo-600"
                      >
                        {clientMap.get(call.client_id) ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dir?.className ?? 'bg-gray-100 text-gray-800'}`}
                      >
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
                        <span
                          className={`font-medium ${
                            call.lead_score >= 8
                              ? 'text-green-600'
                              : call.lead_score >= 5
                                ? 'text-yellow-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {call.lead_score}/10
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {calls.length === 50 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Showing most recent 50 calls. Use filters or visit a client&apos;s call log for more.
        </p>
      )}
    </div>
  )
}
