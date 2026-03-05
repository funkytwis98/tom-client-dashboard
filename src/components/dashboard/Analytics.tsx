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
    { count: newLeadsToday },
    { count: hotLeads },
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
    leadsQuery().gte('created_at', todayStart),
    leadsQuery()
      .in('urgency', ['high', 'urgent'])
      .in('status', ['new', 'contacted']),
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Calls Today" value={callsToday ?? 0} />
      <StatCard label="Leads This Week" value={leadsThisWeek ?? 0} />
      <StatCard label="Avg Call Duration" value={formatDuration(avgDuration)} />
      <StatCard label="Booking Rate" value={`${conversionRate}%`} />
      <StatCard label="New Leads Today" value={newLeadsToday ?? 0} />
      <StatCard label="Hot Leads" value={hotLeads ?? 0} highlight={!!hotLeads} />
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? 'border-red-200 bg-red-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          highlight ? 'text-red-700' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
