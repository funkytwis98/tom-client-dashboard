import Link from 'next/link'
import { UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClientFilterSelect } from '@/components/dashboard/ClientFilterSelect'
import { EmptyState } from '@/components/dashboard/EmptyState'
import type { Customer, Client } from '@/types/domain'

interface CustomersPageProps {
  searchParams: Promise<{ status?: string; client?: string }>
}

const STATUS_BADGE: Record<Customer['status'], { label: string; className: string }> = {
  active:   { label: 'Active',   className: 'bg-green-100 text-green-800' },
  vip:      { label: 'VIP',      className: 'bg-purple-100 text-purple-800' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700' },
}

const SOURCE_BADGE: Record<Customer['source'], { label: string; className: string }> = {
  manual:         { label: 'Manual',    className: 'bg-blue-100 text-blue-800' },
  auto_converted: { label: 'From Lead', className: 'bg-gray-200 text-gray-800' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { status, client: clientFilter } = await searchParams
  const supabase = await createClient()

  const [allCustomersResult, filteredResult, clientsResult] = await Promise.all([
    supabase.from('customers').select('status').limit(1000),
    (() => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (status && status !== 'all') query = query.eq('status', status)
      if (clientFilter && clientFilter !== 'all') query = query.eq('client_id', clientFilter)
      return query
    })(),
    supabase.from('clients').select('id, name').order('name'),
  ])

  const allCustomers = (allCustomersResult.data ?? []) as { status: string }[]
  const customers: Customer[] = filteredResult.error ? [] : ((filteredResult.data ?? []) as Customer[])
  const clients: Pick<Client, 'id' | 'name'>[] = clientsResult.error ? [] : ((clientsResult.data ?? []) as Pick<Client, 'id' | 'name'>[])
  const clientMap = new Map(clients.map((c) => [c.id, c.name]))

  const counts = {
    all: allCustomers.length,
    active: allCustomers.filter((c) => c.status === 'active').length,
    vip: allCustomers.filter((c) => c.status === 'vip').length,
    inactive: allCustomers.filter((c) => c.status === 'inactive').length,
  }

  function filterHref(params: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = { status: status ?? 'all', client: clientFilter ?? 'all', ...params }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all') sp.set(k, v)
    }
    const qs = sp.toString()
    return `/customers${qs ? `?${qs}` : ''}`
  }

  const statusTabs = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'vip', label: 'VIP', count: counts.vip },
    { value: 'inactive', label: 'Inactive', count: counts.inactive },
  ]

  const activeStatus = status ?? 'all'

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">All customers across clients</p>
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
            <span className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs ${
              activeStatus === tab.value ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Client filter */}
      {clients.length > 0 && (
        <div className="flex items-center gap-1 mb-6">
          <span className="text-xs font-medium text-gray-500 mr-1">Client:</span>
          <ClientFilterSelect
            clients={clients}
            currentValue={clientFilter ?? 'all'}
            basePath="/customers"
            currentParams={{ status: status ?? 'all' }}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState
            icon={<UserCircle className="h-12 w-12" />}
            title="No customers yet"
            description="Customer profiles are created from call interactions. They'll appear here as your business receives calls."
          />
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => {
                  const st = STATUS_BADGE[customer.status]
                  const src = SOURCE_BADGE[customer.source]
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/clients/${customer.client_id}/customers/${customer.id}`} className="font-medium text-gray-900 hover:text-gray-700">{customer.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        <Link href={`/clients/${customer.client_id}/customers`} className="hover:text-gray-900">{clientMap.get(customer.client_id) ?? '—'}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{customer.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate">{customer.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {customer.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{tag}</span>
                          ))}
                          {customer.tags.length > 2 && <span className="text-xs text-gray-400">+{customer.tags.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${src.className}`}>{src.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(customer.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {customers.map((customer) => {
              const st = STATUS_BADGE[customer.status]
              return (
                <Link key={customer.id} href={`/clients/${customer.client_id}/customers/${customer.id}`} className="block p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${st.className}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{customer.phone ?? '—'}</p>
                  {customer.email && <p className="text-xs text-gray-400 truncate mb-2">{customer.email}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{customer.total_calls} {customer.total_calls === 1 ? 'call' : 'calls'}</span>
                    <span>{formatDate(customer.created_at)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
          </>
        )}
      </div>

      {customers.length === 200 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Showing most recent 200 customers. Use filters or visit a client&apos;s customer page for more.
        </p>
      )}
    </div>
  )
}
