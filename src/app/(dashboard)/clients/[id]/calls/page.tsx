import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClient } from '@/app/actions/clients'
import { CallLogTable } from '@/components/dashboard/CallLogTable'
import type { Call } from '@/types/domain'

interface CallsPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string; status?: string }>
}

export default async function CallsPage({ params, searchParams }: CallsPageProps) {
  const { id } = await params
  const { direction, status } = await searchParams

  const [client] = await Promise.all([getClient(id)])
  if (!client) {
    notFound()
  }

  const supabase = await createClient()
  let query = supabase
    .from('calls')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (direction && direction !== 'all') {
    query = query.eq('direction', direction)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  const calls: Call[] = error ? [] : ((data ?? []) as Call[])

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/clients" className="hover:text-gray-900 transition-colors">
          Clients
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{client.name}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">Calls</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Log</h1>
          <p className="text-sm text-gray-500 mt-1">{client.name}</p>
        </div>
        <Link
          href={`/clients/${id}/leads`}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
        >
          View Leads
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <CallLogTable clientId={id} initialCalls={calls} />
      </div>
    </div>
  )
}
