import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'
import { KnowledgeEditor } from '@/components/dashboard/KnowledgeEditor'
import type { KnowledgeEntry } from '@/types/domain'

export default async function KnowledgeBasePage() {
  const ctx = await getUserContext()

  if (!ctx?.clientId) {
    redirect('/knowledge')
  }

  const supabase = await createClient()

  const [entriesRes, servicesRes, hoursRes] = await Promise.all([
    supabase
      .from('knowledge_base')
      .select('*')
      .eq('client_id', ctx.clientId)
      .eq('is_active', true)
      .in('category', ['faq', 'policies', 'promotions'])
      .order('priority', { ascending: false }),
    supabase
      .from('services_pricing')
      .select('*')
      .eq('client_id', ctx.clientId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('business_hours')
      .select('*')
      .eq('client_id', ctx.clientId)
      .order('day_of_week', { ascending: true }),
  ])

  const agentName = ctx.agentName ?? 'Your receptionist'

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[#111]">Knowledge Base</h1>
        <p className="text-sm text-[#777] mt-1">
          Everything {agentName} knows about your business. Keep this updated so {agentName} gives accurate answers.
        </p>
      </div>

      <KnowledgeEditor
        clientId={ctx.clientId}
        agentName={agentName}
        initialEntries={(entriesRes.data ?? []) as KnowledgeEntry[]}
        initialServices={servicesRes.data ?? []}
        initialHours={hoursRes.data ?? []}
      />
    </div>
  )
}
