import { createClient } from '@/lib/supabase/server'
import { LearnLoop } from '@/components/dashboard/LearnLoop'

const CLIENT_ID = 'c1000000-0000-0000-0000-000000000001'

export default async function LearnPage() {
  const supabase = await createClient()

  const [questionsResult, categoriesResult] = await Promise.all([
    supabase
      .from('unanswered_questions')
      .select('*, calls(caller_name, caller_number, created_at)')
      .eq('client_id', CLIENT_ID)
      .order('created_at', { ascending: false }),
    supabase
      .from('knowledge_base')
      .select('category')
      .eq('client_id', CLIENT_ID)
      .eq('is_active', true),
  ])

  const questions = questionsResult.error ? [] : (questionsResult.data ?? [])
  const categories = [...new Set((categoriesResult.data ?? []).map((r: { category: string }) => r.category))]

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Teach Sarah</h1>
        <p className="text-sm text-gray-500 mt-1">Answer questions Sarah couldn&apos;t handle and grow her knowledge</p>
      </div>
      <LearnLoop initialQuestions={questions} kbCategories={categories} />
    </div>
  )
}
