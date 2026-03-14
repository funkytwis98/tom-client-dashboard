import Link from 'next/link'
import { getClients } from '@/app/actions/clients'
import { createClient } from '@/lib/supabase/server'
import { HelpTooltip } from '@/components/dashboard/HelpTooltip'
import type { Client } from '@/types/domain'

export default async function KnowledgePage() {
  let clients: Client[] = []
  const entryCounts: Record<string, number> = {}

  try {
    const supabase = await createClient()
    const [clientsResult, countsResult] = await Promise.all([
      getClients(),
      supabase
        .from('knowledge_base')
        .select('client_id')
        .eq('is_active', true),
    ])
    clients = clientsResult

    for (const row of (countsResult.data ?? []) as { client_id: string }[]) {
      entryCounts[row.client_id] = (entryCounts[row.client_id] ?? 0) + 1
    }
  } catch {
    // fall through with empty data
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <HelpTooltip text="This is what Tom knows about your business. Add info here so Tom can answer customer questions better." />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Manage AI knowledge per client
        </p>
      </div>

      {clients.length === 0 ? (
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-900">No clients yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Add a client first, then manage their knowledge base.
          </p>
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
            const count = entryCounts[client.id] ?? 0
            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}/knowledge`}
                className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <h2 className="font-semibold text-gray-900">{client.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{client.slug}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  {count} {count === 1 ? 'entry' : 'entries'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
