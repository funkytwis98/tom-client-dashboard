import { createClient } from '@/lib/supabase/server'

export async function HealthOverview() {
  const supabase = await createClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: callsToday },
    { count: callsWeek },
    { count: callsMonth },
    { count: leadsWeek },
    { count: bookedLeads },
    { count: totalLeadsWeek },
    { data: leadScores },
    { count: recentErrors },
    { count: webhookCount },
    { data: lastCallData },
  ] = await Promise.all([
    supabase.from('calls').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).neq('status', 'in_progress'),
    supabase.from('calls').select('*', { count: 'exact', head: true }).gte('created_at', weekStart).neq('status', 'in_progress'),
    supabase.from('calls').select('*', { count: 'exact', head: true }).gte('created_at', monthStart).neq('status', 'in_progress'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekStart).in('status', ['booked', 'completed']),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('leads').select('lead_score, calls(lead_score)').gte('created_at', weekStart),
    supabase.from('system_errors').select('*', { count: 'exact', head: true }).eq('resolved', false).gte('created_at', last24h),
    supabase.from('webhook_processing_log').select('*', { count: 'exact', head: true }).gte('processed_at', last24h),
    supabase.from('calls').select('created_at').neq('status', 'in_progress').order('created_at', { ascending: false }).limit(1),
  ])

  const conversionRate = totalLeadsWeek ? Math.round(((bookedLeads ?? 0) / totalLeadsWeek) * 100) : 0

  // Calculate average lead score from calls join
  let avgScore = 0
  if (leadScores && leadScores.length > 0) {
    const scores = leadScores
      .map((l: Record<string, unknown>) => (l.calls as Record<string, unknown> | null)?.lead_score ?? l.lead_score)
      .filter((s: unknown) => s != null && (s as number) > 0) as number[]
    avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10 : 0
  }

  const lastCallAt = lastCallData?.[0]?.created_at
  let lastCallAgo = 'No calls yet'
  if (lastCallAt) {
    const diffMs = now.getTime() - new Date(lastCallAt).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) lastCallAgo = 'Just now'
    else if (diffMin < 60) lastCallAgo = `${diffMin}m ago`
    else if (diffMin < 1440) lastCallAgo = `${Math.floor(diffMin / 60)}h ago`
    else lastCallAgo = `${Math.floor(diffMin / 1440)}d ago`
  }

  const errCount = recentErrors ?? 0
  const whCount = webhookCount ?? 0

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
        <span className="text-xs text-gray-400">Last 24h</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Call counts */}
        <HealthCard label="Calls Today" value={callsToday ?? 0} />
        <HealthCard label="Calls This Week" value={callsWeek ?? 0} />
        <HealthCard label="Calls This Month" value={callsMonth ?? 0} />

        {/* Leads */}
        <HealthCard
          label="Leads (Week)"
          value={`${leadsWeek ?? 0}`}
          sub={`${conversionRate}% conversion`}
        />

        {/* Avg Lead Score */}
        <HealthCard label="Avg Lead Score" value={avgScore > 0 ? `${avgScore}/10` : '—'} />

        {/* Last call */}
        <HealthCard label="Last Call" value={lastCallAgo} />
      </div>

      {/* System status row */}
      <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
        <StatusPill
          ok={errCount === 0}
          label={errCount === 0 ? 'No errors' : `${errCount} error${errCount !== 1 ? 's' : ''}`}
        />
        <StatusPill
          ok={true}
          label={`${whCount} webhook${whCount !== 1 ? 's' : ''} processed`}
        />
      </div>
    </div>
  )
}

function HealthCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <div className="h-2 w-2 rounded-full bg-red-500" />
      )}
      <span className={`text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>{label}</span>
    </div>
  )
}
