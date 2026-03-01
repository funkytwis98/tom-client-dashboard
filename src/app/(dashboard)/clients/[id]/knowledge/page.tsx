import { createClient } from '@/lib/supabase/server'
import { KnowledgeEditor } from '@/components/dashboard/KnowledgeEditor'
import { getClient } from '@/app/actions/clients'
import Link from 'next/link'
import type { KnowledgeEntry } from '@/types/domain'

interface Props {
  params: Promise<{ id: string }>
}

export default async function KnowledgePage({ params }: Props) {
  const { id } = await params
  const [client, supabase] = await Promise.all([
    getClient(id),
    createClient(),
  ])

  const { data: entries } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('client_id', id)
    .order('priority', { ascending: false })

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${id}`} className="hover:text-gray-700">
          {client?.name ?? 'Client'}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Knowledge Base</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Knowledge Base{client?.name ? ` — ${client.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage the information your AI receptionist uses when answering calls.
        </p>
      </div>

      <KnowledgeEditor
        clientId={id}
        initialEntries={(entries ?? []) as KnowledgeEntry[]}
      />
    </div>
  )
}
