import { createClient } from '@/lib/supabase/server'

interface AnalyticsProps {
  clientId?: string
}

export async function Analytics({ clientId }: AnalyticsProps) {
  const supabase = await createClient()

  const now = new Date()
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString()
  const weekStart = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  // Build base queries — scope to clientId when provided
  function callsQuery() {
    const q = supabase.from('calls').select('*', { count: 'exact', head: true })
    return clientId ? q.eq('client_id', clientId) : q
  }
  function leadsQuery() {
    const q = supabase.from('leads').select('*', { count: 'exact', head: true })
    return clientId ? q.eq('client_id', clientId) : q
  }
  function durationQuery() {
    const q = supabase.from('calls').select('duration_seconds')
    return clientId ? q.eq('client_id', clientId) : q
  }

  const [
    { count: callsToday },
    { count: leadsThisWeek },
    { data: durationData },
    { count: bookedLeads },
    { count: totalLeads },
  ] = await Promise.all([
    callsQuery()
      .gte('created_at', todayStart)
      .neq('status', 'in_progress'),
    leadsQuery().gte('created_at', weekStart),
    durationQuery()
      .gte('created_at', weekStart)
      .not('duration_seconds', 'is', null),
    leadsQuery().eq('status', 'booked'),
    leadsQuery(),
  ])

  const avgDuration =
    durationData && durationData.length > 0
      ? Math.round(
          durationData.reduce(
            (sum, c) => sum + (c.duration_seconds ?? 0),
            0
          ) / durationData.length
        )
      : 0

  const conversionRate =
    totalLeads ? Math.round(((bookedLeads ?? 0) / totalLeads) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Calls Today" value={callsToday ?? 0} />
      <StatCard label="Leads This Week" value={leadsThisWeek ?? 0} />
      <StatCard label="Avg Call Duration" value={formatDuration(avgDuration)} />
      <StatCard label="Booking Rate" value={`${conversionRate}%`} />
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
