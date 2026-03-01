import { createClient } from '@/lib/supabase/server'
import { AgentConfigForm } from '@/components/dashboard/AgentConfigForm'
import { getClient } from '@/app/actions/clients'
import Link from 'next/link'
import type { AgentConfig } from '@/types/domain'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AgentConfigPage({ params }: Props) {
  const { id } = await params
  const [client, supabase] = await Promise.all([
    getClient(id),
    createClient(),
  ])

  const { data: agentConfig } = await supabase
    .from('agent_config')
    .select('*')
    .eq('client_id', id)
    .single()

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
        <span className="text-gray-900 font-medium">Agent Config</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Agent Configuration{client?.name ? ` — ${client.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your AI receptionist&apos;s name, personality, voice, and call
          handling rules. Use &quot;Save &amp; Sync to Retell&quot; to push changes live.
        </p>
      </div>

      <div className="max-w-2xl">
        <AgentConfigForm
          clientId={id}
          initialConfig={(agentConfig ?? null) as AgentConfig | null}
        />
      </div>
    </div>
  )
}
