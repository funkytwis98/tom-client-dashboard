import { createClient } from '@/lib/supabase/server'
import { Analytics } from '@/components/dashboard/Analytics'
import { SystemHealth } from '@/components/dashboard/SystemHealth'
import { CallVolumeChart } from '@/components/dashboard/CallVolumeChart'
import Link from 'next/link'
import type { Call, Lead } from '@/types/domain'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPhone(phone: string | null): string {
  if (!phone) return 'Unknown'
  return phone
}

function sentimentBadge(sentiment: string | null) {
  if (!sentiment) return null
  const map: Record<string, string> = {
    positive: 'bg-green-50 text-green-700',
    neutral: 'bg-gray-100 text-gray-600',
    negative: 'bg-red-50 text-red-700',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        map[sentiment] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {sentiment}
    </span>
  )
}

function urgencyBadge(urgency: string) {
  const map: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-50 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        map[urgency] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {urgency}
    </span>
  )
}

async function getCallVolumeData(supabase: Awaited<ReturnType<typeof createClient>>, clientId?: string) {
  const days = 14
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))

  let q = supabase
    .from('calls')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .neq('status', 'in_progress')
  if (clientId) q = q.eq('client_id', clientId)

  const { data: calls } = await q
  const countsByDate = new Map<string, number>()
  for (const call of calls ?? []) {
    const d = new Date(call.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1)
  }

  const results: { date: string; calls: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    results.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: countsByDate.get(key) ?? 0,
    })
  }
  return results
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch recent calls with client name join
  const { data: recentCalls } = await supabase
    .from('calls')
    .select('*, clients(name)')
    .neq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(10)

  const calls = (recentCalls ?? []) as (Call & { clients: { name: string } | null })[]

  // Fetch hot leads — high/urgent urgency, new/contacted status, top 5 by lead_score
  const { data: hotLeadsData } = await supabase
    .from('leads')
    .select('*, calls(lead_score), clients(name)')
    .in('urgency', ['high', 'urgent'])
    .in('status', ['new', 'contacted'])
    .order('created_at', { ascending: false })
    .limit(5)

  const hotLeads = (hotLeadsData ?? []) as (Lead & {
    calls: { lead_score: number | null } | null
    clients: { name: string } | null
  })[]

  // Call volume chart data
  const chartData = await getCallVolumeData(supabase)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your AI receptionist activity
        </p>
      </div>

      {/* System health — hidden when all clear */}
      <SystemHealth />

      {/* Analytics stats — server-side queries */}
      <div className="mb-8">
        <Analytics />
      </div>

      {/* Call volume chart */}
      <div className="mb-8">
        <CallVolumeChart data={chartData} />
      </div>

      {/* Quick Links */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/clients"
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">Clients</p>
            <p className="text-xs text-gray-500 mt-0.5">Manage businesses</p>
          </div>
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        <Link
          href="/calls"
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">Calls</p>
            <p className="text-xs text-gray-500 mt-0.5">View call log</p>
          </div>
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        <Link
          href="/leads"
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">Leads</p>
            <p className="text-xs text-gray-500 mt-0.5">Track pipeline</p>
          </div>
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>

      {/* Recent calls */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Calls</h2>
          <Link
            href="/calls"
            className="text-sm text-indigo-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {calls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <p className="mt-3 text-sm text-gray-500">No calls yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Calls will appear here once Retell AI is connected
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {calls.map((call) => (
              <li key={call.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {call.caller_name ?? formatPhone(call.caller_number)}
                    </p>
                    {call.clients?.name && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-medium">
                        {call.clients.name}
                      </span>
                    )}
                    {sentimentBadge(call.sentiment)}
                    {call.lead_score != null && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 font-medium">
                        Score {call.lead_score}/10
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 truncate">
                    {call.summary ?? 'No summary yet'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">
                    {formatDuration(call.duration_seconds)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(call.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hot Leads */}
      {hotLeads.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Hot Leads</h2>
            <Link
              href="/leads"
              className="text-sm text-indigo-600 hover:underline"
            >
              View all leads
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {hotLeads.map((lead) => (
              <li key={lead.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {lead.name ?? formatPhone(lead.phone)}
                    </p>
                    {lead.clients?.name && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-medium">
                        {lead.clients.name}
                      </span>
                    )}
                    {urgencyBadge(lead.urgency)}
                    {lead.calls?.lead_score != null && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 font-medium">
                        Score {lead.calls.lead_score}/10
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 truncate">
                    {lead.service_interested ?? 'No service specified'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Link
                    href={`/clients/${lead.client_id}/leads`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
