import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClient } from '@/app/actions/clients'
import { EditClientForm } from '@/components/dashboard/EditClientForm'
import { InviteOwnerButton } from '@/components/dashboard/InviteOwnerButton'
import { Analytics } from '@/components/dashboard/Analytics'
import { CallVolumeChart } from '@/components/dashboard/CallVolumeChart'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

const TABS = [
  { label: 'Details', href: '' },
  { label: 'Calls', href: '/calls' },
  { label: 'Leads', href: '/leads' },
  { label: 'Customers', href: '/customers' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'Agent', href: '/agent' },
  { label: 'Playbook', href: '/playbook' },
  { label: 'Website', href: '/website' },
  { label: 'Billing', href: '/billing' },
]

async function getCallVolumeData(clientId: string) {
  const supabase = await createClient()
  const days = 14
  const results: { date: string; calls: number }[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()

    const { count } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', dayStart)
      .lt('created_at', dayEnd)
      .neq('status', 'in_progress')

    results.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: count ?? 0,
    })
  }
  return results
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  const chartData = await getCallVolumeData(id)

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">
          Clients
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{client.name}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Edit client details and configuration
        </p>
      </div>

      {/* Sub-nav tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const isActive = tab.href === ''
            return (
              <Link
                key={tab.label}
                href={`/clients/${id}${tab.href}`}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mb-8">
        <Analytics clientId={id} />
      </div>

      <div className="mb-8">
        <CallVolumeChart data={chartData} />
      </div>

      <div className="mb-6">
        <InviteOwnerButton clientId={id} ownerEmail={client.owner_email} />
      </div>

      <EditClientForm client={client} />
    </div>
  )
}
