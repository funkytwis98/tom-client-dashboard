import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClient } from '@/app/actions/clients'
import { getLeadsForClient } from '@/app/actions/leads'
import { LeadsPipeline } from '@/components/dashboard/LeadsPipeline'

interface LeadsPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadsPage({ params }: LeadsPageProps) {
  const { id } = await params
  const [client, leads] = await Promise.all([
    getClient(id),
    getLeadsForClient(id).catch(() => []),
  ])

  if (!client) {
    notFound()
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/clients" className="hover:text-gray-900 transition-colors">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${id}/calls`} className="hover:text-gray-900 transition-colors">
          {client.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Leads</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{client.name}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clients/${id}/calls`}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            View Calls
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <LeadsPipeline clientId={id} initialLeads={leads} />
      </div>
    </div>
  )
}
