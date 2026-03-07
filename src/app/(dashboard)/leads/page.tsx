import Link from 'next/link'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClientFilterSelect } from '@/components/dashboard/ClientFilterSelect'
import { EmptyState } from '@/components/dashboard/EmptyState'
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

  // Fetch all leads (for tab counts), clients, and converted lead IDs in parallel
  const [allLeadsResult, filteredLeadsResult, clientsResult, convertedResult] = await Promise.all([
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
    supabase
      .from('customers')
      .select('converted_from_lead_id')
      .not('converted_from_lead_id', 'is', null),
  ])

  const allLeads = (allLeadsResult.data ?? []) as { status: string }[]
  const leads: Lead[] = filteredLeadsResult.error
    ? []
    : ((filteredLeadsResult.data ?? []) as Lead[])
  const clients: Pick<Client, 'id' | 'name'>[] = clientsResult.error
    ? []
    : ((clientsResult.data ?? []) as Pick<Client, 'id' | 'name'>[])

  const clientMap = new Map(clients.map((c) => [c.id, c.name]))
  const convertedLeadIds = new Set(
    (convertedResult.data ?? []).map((d: { converted_from_lead_id: string }) => d.converted_from_lead_id)
  )

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
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">All leads across clients</p>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={filterHref({ status: tab.value })}
            className={`min-h-[44px] md:min-h-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center shrink-0 ${
              activeStatus === tab.value
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs ${
                activeStatus === tab.value
                  ? 'bg-gray-200 text-gray-900'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-gray-500 mr-1">Urgency:</span>
          {urgencyFilters.map((f) => (
            <Link
              key={f.value}
              href={filterHref({ urgency: f.value })}
              className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
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
              basePath="/leads"
              currentParams={{
                status: status ?? 'all',
                urgency: urgency ?? 'all',
              }}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {leads.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No leads yet"
            description="Leads are automatically captured from incoming calls. They'll show up here once customers start calling."
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => {
                  const st = STATUS_BADGE[lead.status]
                  const urg = URGENCY_BADGE[lead.urgency]
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <Link href={`/clients/${lead.client_id}/leads`} className="hover:text-gray-900">{clientMap.get(lead.client_id) ?? '—'}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{lead.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{lead.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate">{lead.service_interested ?? '—'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap"><span className={urg.className}>{urg.label}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                        {convertedLeadIds.has(lead.id) && (
                          <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Converted</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {leads.map((lead) => {
              const st = STATUS_BADGE[lead.status]
              const urg = URGENCY_BADGE[lead.urgency]
              return (
                <div key={lead.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{lead.name ?? '—'}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${urg.className}`}>{urg.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{lead.service_interested ?? 'No service specified'}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                      {convertedLeadIds.has(lead.id) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Converted</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          </>
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
