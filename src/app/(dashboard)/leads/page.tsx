import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientFilterSelect } from '@/components/dashboard/ClientFilterSelect'
import type { Lead, Client } from '@/types/domain'

interface LeadsPageProps {
  searchParams: Promise<{ status?: string; urgency?: string; client?: string }>
}

const STATUS_BADGE: Record<Lead['status'], { label: string; className: string }> = {
  new:       { label: 'New',       className: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-800' },
  booked:    { label: 'Booked',    className: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-800' },
  lost:      { label: 'Lost',      className: 'bg-red-100 text-red-800' },
}

const URGENCY_BADGE: Record<Lead['urgency'], { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'text-gray-500' },
  medium: { label: 'Medium', className: 'text-yellow-600' },
  high:   { label: 'High',   className: 'text-orange-600 font-medium' },
  urgent: { label: 'Urgent', className: 'text-red-600 font-medium' },
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

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { status, urgency, client: clientFilter } = await searchParams

  const supabase = await createClient()

  // Fetch all leads (for tab counts) and clients in parallel
  const [allLeadsResult, filteredLeadsResult, clientsResult] = await Promise.all([
    supabase
      .from('leads')
      .select('status')
      .limit(1000),
    (() => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
      if (urgency && urgency !== 'all') {
        query = query.eq('urgency', urgency)
      }
      if (clientFilter && clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter)
      }
      return query
    })(),
    supabase.from('clients').select('id, name').order('name'),
  ])

  const allLeads = (allLeadsResult.data ?? []) as { status: string }[]
  const leads: Lead[] = filteredLeadsResult.error
    ? []
    : ((filteredLeadsResult.data ?? []) as Lead[])
  const clients: Pick<Client, 'id' | 'name'>[] = clientsResult.error
    ? []
    : ((clientsResult.data ?? []) as Pick<Client, 'id' | 'name'>[])

  const clientMap = new Map(clients.map((c) => [c.id, c.name]))

  // Compute tab counts from full result set
  const counts = {
    all: allLeads.length,
    new: allLeads.filter((l) => l.status === 'new').length,
    contacted: allLeads.filter((l) => l.status === 'contacted').length,
    booked: allLeads.filter((l) => l.status === 'booked').length,
    lost: allLeads.filter((l) => l.status === 'lost').length,
  }

  function filterHref(params: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = {
      status: status ?? 'all',
      urgency: urgency ?? 'all',
      client: clientFilter ?? 'all',
      ...params,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all') sp.set(k, v)
    }
    const qs = sp.toString()
    return `/leads${qs ? `?${qs}` : ''}`
  }

  const statusTabs = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'new', label: 'New', count: counts.new },
    { value: 'contacted', label: 'Contacted', count: counts.contacted },
    { value: 'booked', label: 'Booked', count: counts.booked },
    { value: 'lost', label: 'Lost', count: counts.lost },
  ]

  const urgencyFilters = [
    { value: 'all', label: 'All' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  const activeStatus = status ?? 'all'
  const activeUrgency = urgency ?? 'all'

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">All leads across clients</p>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={filterHref({ status: tab.value })}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeStatus === tab.value
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs ${
                activeStatus === tab.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500 mr-1">Urgency:</span>
          {urgencyFilters.map((f) => (
            <Link
              key={f.value}
              href={filterHref({ urgency: f.value })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeUrgency === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

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
        {leads.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="mt-3 text-sm font-medium text-gray-900">No leads found</p>
            <p className="text-xs text-gray-500 mt-1">
              Leads are captured automatically from AI receptionist calls.
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
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Service
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Urgency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => {
                const st = STATUS_BADGE[lead.status]
                const urg = URGENCY_BADGE[lead.urgency]
                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <Link
                        href={`/clients/${lead.client_id}/leads`}
                        className="hover:text-indigo-600"
                      >
                        {clientMap.get(lead.client_id) ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {lead.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {lead.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                      {lead.service_interested ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={urg.className}>{urg.label}</span>
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

      {leads.length === 200 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Showing most recent 200 leads. Use filters or visit a client&apos;s leads page for more.
        </p>
      )}
    </div>
  )
}
