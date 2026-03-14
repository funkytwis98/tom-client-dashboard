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
  const supabase = await createClient()

  const [client, entriesRes, servicesRes, hoursRes, agentRes] = await Promise.all([
    getClient(id),
    supabase
      .from('knowledge_base')
      .select('*')
      .eq('client_id', id)
      .eq('is_active', true)
      .in('category', ['faq', 'policies', 'promotions'])
      .order('priority', { ascending: false }),
    supabase
      .from('services_pricing')
      .select('*')
      .eq('client_id', id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('business_hours')
      .select('*')
      .eq('client_id', id)
      .order('day_of_week', { ascending: true }),
    supabase
      .from('agent_config')
      .select('agent_name')
      .eq('client_id', id)
      .single(),
  ])

  const agentName = agentRes.data?.agent_name ?? 'Your receptionist'

  return (
    <div className="p-8 bg-[#fafafa] min-h-screen">
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
        <h1 className="text-2xl font-bold text-[#111]">
          Knowledge Base{client?.name ? ` — ${client.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-[#777]">
          Everything {agentName} knows about your business. Keep this updated so {agentName} gives accurate answers.
        </p>
      </div>

      <KnowledgeEditor
        clientId={id}
        agentName={agentName}
        initialEntries={(entriesRes.data ?? []) as KnowledgeEntry[]}
        initialServices={servicesRes.data ?? []}
        initialHours={hoursRes.data ?? []}
      />
    </div>
  )
}
