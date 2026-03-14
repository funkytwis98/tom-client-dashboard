import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'
import { LearnedTab } from '@/components/dashboard/LearnedTab'

export default async function LearnedPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/login')
  if (!ctx.clientId) redirect('/')

  const clientId = ctx.clientId
  const supabase = await createClient()

  const [gapsRes, suggestionsRes, questionsRes, reflectionsRes, addressedRes] = await Promise.all([
    supabase
      .from('learning_proposals')
      .select('*')
      .eq('client_id', clientId)
      .eq('proposal_type', 'knowledge_gap')
      .neq('status', 'already_addressed')
      .order('created_at', { ascending: false }),
    supabase
      .from('learning_proposals')
      .select('*')
      .eq('client_id', clientId)
      .eq('proposal_type', 'suggestion')
      .neq('status', 'already_addressed')
      .order('created_at', { ascending: false }),
    supabase
      .from('unanswered_questions')
      .select('*, calls(caller_name, caller_number, created_at)')
      .eq('client_id', clientId)
      .neq('status', 'already_addressed')
      .order('created_at', { ascending: false }),
    supabase
      .from('brain_reflections')
      .select('*')
      .eq('client_id', clientId)
      .not('pattern_noticed', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('learning_proposals')
      .select('id, title, proposal_type, reviewed_at')
      .eq('client_id', clientId)
      .eq('status', 'already_addressed')
      .order('reviewed_at', { ascending: false })
      .limit(20),
  ])

  const agentName = ctx.agentName ?? 'Your receptionist'

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      <LearnedTab
        agentName={agentName}
        initialGaps={gapsRes.data ?? []}
        initialSuggestions={suggestionsRes.data ?? []}
        initialQuestions={questionsRes.data ?? []}
        initialPatterns={reflectionsRes.data ?? []}
        initialAddressed={addressedRes.data ?? []}
      />
    </div>
  )
}
