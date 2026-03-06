import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIERS } from '@/lib/stripe/products'
import type { Client } from '@/types/domain'

async function getBillingData() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, slug, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id')
    .order('name')

  if (error) throw new Error(error.message)
  return (clients ?? []) as Pick<Client, 'id' | 'name' | 'slug' | 'subscription_tier' | 'subscription_status' | 'stripe_customer_id' | 'stripe_subscription_id'>[]
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    standard: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-indigo-100 text-indigo-800',
  }
  const config = TIERS[tier as keyof typeof TIERS]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[tier] || 'bg-gray-100 text-gray-800'}`}>
      {config?.name || tier}
    </span>
  )
}

export default async function BillingOverviewPage() {
  const clients = await getBillingData()

  const activeClients = clients.filter((c) => c.subscription_status === 'active')
  const totalMRR = activeClients.reduce((sum, c) => {
    const tier = TIERS[c.subscription_tier]
    return sum + (tier?.price ?? 0)
  }, 0)

  const tierCounts = {
    standard: activeClients.filter((c) => c.subscription_tier === 'standard').length,
    premium: activeClients.filter((c) => c.subscription_tier === 'premium').length,
    enterprise: activeClients.filter((c) => c.subscription_tier === 'enterprise').length,
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Subscription overview across all clients</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Monthly Recurring Revenue</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${totalMRR.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Active Clients</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeClients.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{clients.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Tier Breakdown</p>
          <div className="mt-1 text-sm text-gray-700 space-y-0.5">
            <p>Starter: {tierCounts.standard}</p>
            <p>Professional: {tierCounts.premium}</p>
            <p>Enterprise: {tierCounts.enterprise}</p>
          </div>
        </div>
      </div>

      {/* Client Billing Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe Customer</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  No clients yet. Create a client to get started.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <Link href={`/clients/${client.id}`} className="hover:text-indigo-600 transition-colors">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <TierBadge tier={client.subscription_tier} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={client.subscription_status} />
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500 truncate max-w-[180px]">
                    {client.stripe_customer_id || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/clients/${client.id}/billing`}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
