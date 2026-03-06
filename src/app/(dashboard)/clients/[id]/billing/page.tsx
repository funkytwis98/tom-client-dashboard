import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClient } from '@/app/actions/clients'
import { ClientBillingActions } from '@/components/dashboard/ClientBillingActions'
import { TIERS } from '@/lib/stripe/products'

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

export default async function ClientBillingPage({ params }: Props) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  const tierConfig = TIERS[client.subscription_tier]

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">Clients</Link>
        <span>/</span>
        <Link href={`/clients/${id}`} className="hover:text-gray-700">{client.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Billing</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Subscription & billing management</p>
      </div>

      {/* Sub-nav tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const isActive = tab.href === '/billing'
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

      {/* Subscription Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Tier</p>
            <div className="mt-1">
              <TierBadge tier={client.subscription_tier} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Price</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              ${tierConfig?.price ?? '—'}/mo
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <div className="mt-1">
              <StatusBadge status={client.subscription_status} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Stripe Customer</p>
            <p className="mt-1 text-sm font-mono text-gray-700 truncate">
              {client.stripe_customer_id || '—'}
            </p>
          </div>
        </div>
        {client.stripe_subscription_id && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Subscription ID</p>
            <p className="mt-1 text-sm font-mono text-gray-700">{client.stripe_subscription_id}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <ClientBillingActions
        clientId={id}
        stripeCustomerId={client.stripe_customer_id}
        stripeSubscriptionId={client.stripe_subscription_id}
        currentTier={client.subscription_tier}
        subscriptionStatus={client.subscription_status}
      />
    </div>
  )
}
