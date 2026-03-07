import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientFilterSelect } from '@/components/dashboard/ClientFilterSelect'
import { AgencyCallsTable } from '@/components/dashboard/AgencyCallsTable'
import type { Call, Client } from '@/types/domain'

interface CallsPageProps {
  searchParams: Promise<{ direction?: string; status?: string; client?: string }>
}

const PAGE_SIZE = 10

export default async function CallsPage({ searchParams }: CallsPageProps) {
  const { direction, status, client: clientFilter } = await searchParams

  const supabase = await createClient()

  const buildCallsQuery = () => {
    let query = supabase.from('calls').select('*')
    if (direction && direction !== 'all') query = query.eq('direction', direction)
    if (status && status !== 'all') query = query.eq('status', status)
    if (clientFilter && clientFilter !== 'all') query = query.eq('client_id', clientFilter)
    return query
  }

  const buildCountQuery = () => {
    let query = supabase.from('calls').select('*', { count: 'exact', head: true })
    if (direction && direction !== 'all') query = query.eq('direction', direction)
    if (status && status !== 'all') query = query.eq('status', status)
    if (clientFilter && clientFilter !== 'all') query = query.eq('client_id', clientFilter)
    return query
  }

  const [callsResult, countResult, clientsResult] = await Promise.all([
    buildCallsQuery().order('created_at', { ascending: false }).limit(PAGE_SIZE),
    buildCountQuery(),
    supabase.from('clients').select('id, name').order('name'),
  ])

  const calls: Call[] = callsResult.error ? [] : ((callsResult.data ?? []) as unknown as Call[])
  const totalCount = countResult.count ?? calls.length
  const clients: Pick<Client, 'id' | 'name'>[] = clientsResult.error
    ? []
    : ((clientsResult.data ?? []) as Pick<Client, 'id' | 'name'>[])

  const clientMap: Record<string, string> = {}
  for (const c of clients) {
    clientMap[c.id] = c.name
  }

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
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Calls</h1>
        <p className="text-sm text-gray-500 mt-1">All calls across clients</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
        {/* Direction */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500 mr-1">Direction:</span>
          {directionFilters.map((f) => (
            <Link
              key={f.value}
              href={filterHref({ direction: f.value })}
              className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
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
              className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
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
              basePath="/calls"
              currentParams={{
                direction: direction ?? 'all',
                status: status ?? 'all',
              }}
            />
          </div>
        )}
      </div>

      <AgencyCallsTable
        initialCalls={calls}
        clientMap={clientMap}
        totalCount={totalCount}
        filters={{ direction, status, client: clientFilter }}
      />
    </div>
  )
}
