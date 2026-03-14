import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { redirect } from 'next/navigation'
import { LearnLoop } from '@/components/dashboard/LearnLoop'
import { HelpTooltip } from '@/components/dashboard/HelpTooltip'

export default async function LearnPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/login')
  const clientId = ctx.clientId
  if (!clientId) redirect('/')

  const supabase = await createClient()

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [questionsResult, categoriesResult, proposalsResult, usageResult] = await Promise.all([
    supabase
      .from('unanswered_questions')
      .select('*, calls(caller_name, caller_number, created_at)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('knowledge_base')
      .select('category')
      .eq('client_id', clientId)
      .eq('is_active', true),
    supabase
      .from('learning_proposals')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('usage_log')
      .select('capability, estimated_cost, created_at')
      .eq('client_id', clientId)
      .gte('created_at', monthStart.toISOString()),
  ])

  const questions = questionsResult.error ? [] : (questionsResult.data ?? [])
  const categories = [...new Set((categoriesResult.data ?? []).map((r: { category: string }) => r.category))]
  const proposals = proposalsResult.error ? [] : (proposalsResult.data ?? [])
  const usageLog = usageResult.error ? [] : (usageResult.data ?? [])

  const agentName = ctx?.agentName ?? 'Your receptionist'

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Teach {agentName}</h1>
          <HelpTooltip text={`When ${agentName} doesn't know how to answer a question on a call, it shows up here. Teach ${agentName} the answer and it'll be remembered for next time.`} />
        </div>
        <p className="text-sm text-gray-500 mt-1">Answer questions {agentName} couldn&apos;t handle and grow the knowledge base</p>
      </div>
      <LearnLoop
        initialQuestions={questions}
        kbCategories={categories}
        clientId={clientId}
        initialProposals={proposals}
        usageLog={usageLog}
        agentName={agentName}
      />
    </div>
  )
}
