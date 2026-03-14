import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { WebsiteAnalyticsDashboard } from '@/components/dashboard/WebsiteAnalyticsDashboard'

interface AnalyticsEvent {
  event_type: string
  page_url: string | null
  visitor_id: string | null
  created_at: string
}

interface FormSubmission {
  id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface WebsiteRequest {
  id: string
  request_type: string
  subject: string
  message: string
  status: string
  created_at: string
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export default async function WebsiteAnalyticsPage() {
  const ctx = await getUserContext()
  const clientId = ctx?.clientId

  if (!clientId) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Website</h1>
        <p className="text-gray-500">No client context found.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const now = new Date()
  const weekStartISO = getWeekStart()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString()

  const [
    { data: clientData },
    { data: weekEvents },
    { data: allFormSubmissions },
    { count: totalFormCount },
    { data: websiteRequests },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('website_url')
      .eq('id', clientId)
      .single(),
    supabase
      .from('website_analytics')
      .select('event_type, page_url, visitor_id, created_at')
      .eq('client_id', clientId)
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('website_analytics')
      .select('id, metadata, created_at')
      .eq('client_id', clientId)
      .eq('event_type', 'form_submission')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('website_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('event_type', 'form_submission'),
    supabase
      .from('website_requests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ])

  const websiteUrl: string | null = clientData?.website_url ?? null
  const events: AnalyticsEvent[] = weekEvents ?? []
  const formSubmissions: FormSubmission[] = allFormSubmissions ?? []
  const requests: WebsiteRequest[] = (websiteRequests ?? []) as WebsiteRequest[]

  // Compute stats
  const weekVisitors = new Set<string>()
  let weekPageViews = 0
  const pageCounts: Record<string, number> = {}
  const dailyVisitors: Record<string, Set<string>> = {}

  for (const event of events) {
    const vid = event.visitor_id || 'unknown'
    const date = event.created_at.substring(0, 10)

    if (event.event_type === 'page_view') {
      if (event.created_at >= weekStartISO) {
        weekVisitors.add(vid)
        weekPageViews++
      }

      if (!dailyVisitors[date]) dailyVisitors[date] = new Set()
      dailyVisitors[date].add(vid)

      if (event.page_url) {
        try {
          const path = new URL(event.page_url, 'https://x').pathname
          pageCounts[path] = (pageCounts[path] || 0) + 1
        } catch {
          // skip malformed
        }
      }
    }
  }

  let topPage = '—'
  let topPageCount = 0
  for (const [path, count] of Object.entries(pageCounts)) {
    if (count > topPageCount) {
      topPage = path
      topPageCount = count
    }
  }

  const chartData: { date: string; visitors: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const dateStr = d.toISOString().substring(0, 10)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    chartData.push({
      date: label,
      visitors: dailyVisitors[dateStr]?.size ?? 0,
    })
  }

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111]">Website</h1>
        <p className="text-sm text-[#777] mt-1">
          Your website performance, form submissions, and change requests
        </p>
      </div>

      <WebsiteAnalyticsDashboard
        websiteUrl={websiteUrl}
        visitorsThisWeek={weekVisitors.size}
        pageViewsThisWeek={weekPageViews}
        formSubmissionCount={totalFormCount ?? 0}
        topPage={topPage}
        chartData={chartData}
        formSubmissions={formSubmissions}
        websiteRequests={requests}
      />
    </div>
  )
}
