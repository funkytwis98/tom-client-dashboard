import Link from 'next/link'
import { getClients } from '@/app/actions/clients'
import type { Client } from '@/types/domain'

const STATUS_BADGE: Record<Client['subscription_status'], { label: string; className: string }> = {
  active:    { label: 'Active',    className: 'bg-green-100 text-green-800' },
  paused:    { label: 'Paused',    className: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
}

export default async function ClientsPage() {
  let clients: Client[] = []
  let fetchError: string | null = null

  try {
    clients = await getClients()
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load clients'
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your AI receptionist clients</p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>
      </div>

      {fetchError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {clients.length === 0 && !fetchError ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-900">No clients yet</p>
          <p className="text-xs text-gray-500 mt-1">Add your first client to get started.</p>
          <Link
            href="/clients/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            Add Client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const badge = STATUS_BADGE[client.subscription_status]
            return (
              <div
                key={client.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <Link href={`/clients/${client.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{client.name}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{client.slug}</p>
                    </div>
                    <span
                      className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {client.phone_number && (
                      <p className="text-sm text-gray-600 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {client.phone_number}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 capitalize">{client.subscription_tier} plan</p>
                  </div>
                </Link>

                <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 text-xs text-gray-500">
                  <Link href={`/clients/${client.id}/calls`} className="hover:text-gray-900">View calls</Link>
                  <span>|</span>
                  <Link href={`/clients/${client.id}/leads`} className="hover:text-gray-900">View leads</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
