import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'
import InsightsDashboard from '@/components/dashboard/InsightsDashboard'

export default async function InsightsPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/login')
  if (!ctx.clientId) redirect('/')

  const supabase = await createClient()

  const { data: insights } = await supabase
    .from('business_insights')
    .select('*')
    .eq('client_id', ctx.clientId)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      <InsightsDashboard initialInsights={insights ?? []} />
    </div>
  )
}
