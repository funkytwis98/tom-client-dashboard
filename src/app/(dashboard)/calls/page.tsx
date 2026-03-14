import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { CallCards } from '@/components/dashboard/CallCards'
import type { Call } from '@/types/domain'

export default async function CallsPage() {
  const ctx = await getUserContext()
  const clientId = ctx?.clientId

  if (!clientId) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Calls</h1>
        <p className="text-sm text-gray-500 mt-1">No client found.</p>
      </div>
    )
  }

  const agentName = ctx?.agentName ?? 'Your receptionist'
  const supabase = await createClient()

  const [callsResult, callbackResult] = await Promise.all([
    supabase
      .from('calls')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('callback_promised', true)
      .eq('callback_completed', false),
  ])

  const calls: Call[] = callsResult.error ? [] : ((callsResult.data ?? []) as unknown as Call[])
  const callbackCount = callbackResult.count ?? 0

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Calls</h1>
        <p className="text-[13px] text-[#888] mt-1">Every call {agentName} has handled for your business</p>
      </div>

      <CallCards initialCalls={calls} clientId={clientId} callbackCount={callbackCount} agentName={agentName} />
    </div>
  )
}
