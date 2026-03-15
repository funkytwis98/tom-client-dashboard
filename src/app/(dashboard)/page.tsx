import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { CallVolumeChart } from '@/components/dashboard/CallVolumeChart'
import Link from 'next/link'
import { Phone, Target, Clock, ClipboardList, Users, Globe, FileText, BookOpen, Settings, BarChart3, Heart, Send, Sparkles } from 'lucide-react'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function sentimentColor(sentiment: string | null): string {
  if (sentiment === 'positive') return 'bg-green-50 text-green-700'
  if (sentiment === 'negative') return 'bg-red-50 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

function urgencyDot(urgency: string): string {
  if (urgency === 'high' || urgency === 'urgent') return 'bg-amber-400'
  if (urgency === 'medium') return 'bg-blue-400'
  return 'bg-gray-300'
}

async function getCallVolumeData(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string) {
  const days = 14
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))

  const { data: calls } = await supabase
    .from('calls')
    .select('created_at')
    .eq('client_id', clientId)
    .gte('created_at', startDate.toISOString())
    .neq('status', 'in_progress')

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
  const ctx = await getUserContext()
  const clientId = ctx?.clientId ?? ''
  const ownerName = ctx?.ownerName ?? ctx?.profile?.display_name ?? ctx?.email ?? 'there'
  const firstName = ownerName.split(' ')[0]
  const agentName = ctx?.agentName ?? 'Your receptionist'
  const products = ctx?.productsEnabled ?? []
  const hasReceptionist = products.includes('receptionist')
  const hasSocial = products.includes('social')
  const hasAnyProduct = hasReceptionist || hasSocial

  // Week start (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekStartISO = weekStart.toISOString()

  // --- Base queries (always fetched) ---
  const baseQueries = [
    // Total contacts (confirmed)
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'confirmed'),
    // Website visits this week
    supabase
      .from('website_analytics')
      .select('visitor_id', { count: 'exact', head: false })
      .eq('client_id', clientId)
      .eq('event_type', 'page_view')
      .gte('created_at', weekStartISO),
    // Form submissions this week
    supabase
      .from('website_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('event_type', 'form_submission')
      .gte('created_at', weekStartISO),
  ] as const

  // --- Receptionist queries (conditional) ---
  const receptionistQueries = hasReceptionist ? [
    supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', weekStartISO)
      .neq('status', 'in_progress'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'new')
      .gte('created_at', weekStartISO),
    supabase
      .from('calls')
      .select('duration_seconds')
      .eq('client_id', clientId)
      .gte('created_at', weekStartISO)
      .neq('status', 'in_progress')
      .not('duration_seconds', 'is', null),
    supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('callback_promised', true)
      .eq('callback_completed', false),
    supabase
      .from('calls')
      .select('id, caller_name, caller_number, sentiment, duration_seconds, summary, created_at, callback_promised, callback_completed')
      .eq('client_id', clientId)
      .neq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('id, name, phone, urgency, status, service_interested, created_at')
      .eq('client_id', clientId)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('calls')
      .select('created_at')
      .eq('client_id', clientId)
      .neq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1),
    getCallVolumeData(supabase, clientId),
    supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_active', true),
  ] as const : null

  // --- Social queries (conditional) ---
  const socialQueries = hasSocial ? [
    supabase
      .from('posts')
      .select('id, engagement_likes, engagement_comments, engagement_shares, engagement_reach')
      .eq('client_id', clientId)
      .gte('created_at', weekStartISO),
    supabase
      .from('posts')
      .select('id, engagement_likes, engagement_comments, engagement_shares, engagement_reach, status')
      .eq('client_id', clientId),
  ] as const : null

  // --- Insights query (when receptionist is enabled) ---
  const insightsQuery = hasReceptionist
    ? supabase
        .from('business_insights')
        .select('id, category, priority, title, insight, status, created_at')
        .eq('client_id', clientId)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(3)
    : null

  // Execute all in parallel
  const [baseResults, recResults, socialResults, insightsResult] = await Promise.all([
    Promise.all(baseQueries),
    receptionistQueries ? Promise.all(receptionistQueries) : Promise.resolve(null),
    socialQueries ? Promise.all(socialQueries) : Promise.resolve(null),
    insightsQuery ?? Promise.resolve({ data: null }),
  ])

  // Base metrics
  const totalContacts = baseResults[0].count ?? 0
  const websiteVisitorCount = baseResults[1].count ?? 0
  const formCount = baseResults[2].count ?? 0

  // Receptionist metrics
  let callsThisWeek = 0, newLeadsCount = 0, avgDuration = 0, callbacksDue = 0
  let recentCalls: Array<{ id: string; caller_name: string | null; caller_number: string | null; sentiment: string | null; duration_seconds: number | null; summary: string | null; created_at: string; callback_promised: boolean; callback_completed: boolean }> = []
  let recentLeads: Array<{ id: string; name: string | null; phone: string | null; urgency: string; status: string; service_interested: string | null; created_at: string }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastCall: any = null
  let chartData: { date: string; calls: number }[] = []
  let kbCount = 0

  if (recResults) {
    callsThisWeek = recResults[0].count ?? 0
    newLeadsCount = recResults[1].count ?? 0
    const durationData = recResults[2].data ?? []
    avgDuration = durationData.length > 0
      ? Math.round(durationData.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / durationData.length)
      : 0
    callbacksDue = recResults[3].count ?? 0
    recentCalls = (recResults[4].data ?? []) as typeof recentCalls
    recentLeads = (recResults[5].data ?? []) as typeof recentLeads
    lastCall = recResults[6].data?.[0] ?? null
    chartData = recResults[7] as typeof chartData
    kbCount = recResults[8].count ?? 0
  }

  // Social metrics
  let postsThisWeek = 0, totalEngagement = 0, totalReach = 0
  if (socialResults) {
    const weekPosts = socialResults[0].data ?? []
    postsThisWeek = weekPosts.length
    const allPosts = socialResults[1].data ?? []
    const publishedPosts = allPosts.filter(p => p.status === 'published')
    totalEngagement = publishedPosts.reduce((s, p) => s + (p.engagement_likes ?? 0) + (p.engagement_comments ?? 0) + (p.engagement_shares ?? 0), 0)
    totalReach = publishedPosts.reduce((s, p) => s + (p.engagement_reach ?? 0), 0)
  }

  // Insights
  const newInsights = (insightsResult?.data ?? []) as Array<{ id: string; category: string; priority: string; title: string; insight: string; status: string; created_at: string }>

  const hasCallbacks = callbacksDue > 0
  const subtitle = hasAnyProduct
    ? `Here\u2019s what${hasReceptionist ? ` ${agentName}` : ' your tools'} ${hasReceptionist ? 'has' : 'have'} been doing for your business.`
    : 'Welcome to your dashboard. Enable products from your agency to get started.'

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111]" suppressHydrationWarning>
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-[#777] mt-1">{subtitle}</p>
      </div>

      {/* Base Stat Cards — always visible */}
      <div className={`grid grid-cols-2 md:grid-cols-${hasReceptionist || hasSocial ? '4' : '3'} gap-4 mb-4`}>
        <StatCard icon={<Globe size={18} className="text-[#999]" />} label="Website Visits" value={websiteVisitorCount} href="/website-analytics" />
        <StatCard icon={<Users size={18} className="text-[#999]" />} label="Total Contacts" value={totalContacts} href="/crm" />
        <StatCard icon={<FileText size={18} className="text-[#999]" />} label="Form Submissions" value={formCount} href="/website-analytics" />

        {/* Fill 4th slot based on what's enabled */}
        {hasReceptionist && (
          <StatCard icon={<Phone size={18} className="text-[#999]" />} label="Calls This Week" value={callsThisWeek} href="/calls" />
        )}
        {!hasReceptionist && hasSocial && (
          <StatCard icon={<Send size={18} className="text-[#999]" />} label="Posts This Week" value={postsThisWeek} href="/content" />
        )}
      </div>

      {/* Receptionist Stat Cards */}
      {hasReceptionist && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard icon={<Target size={18} className="text-[#999]" />} label="New Leads" value={newLeadsCount} href="/leads" />
          <StatCard icon={<Clock size={18} className="text-[#999]" />} label="Avg Duration" value={formatDuration(avgDuration)} href="/calls" />
          <StatCard
            icon={<ClipboardList size={18} className="text-[#999]" />}
            label="Callbacks Due"
            value={callbacksDue}
            highlight={hasCallbacks}
            subtitle={hasCallbacks ? 'Needs follow-up' : undefined}
            href="/calls?filter=callback"
          />
          {hasSocial ? (
            <StatCard icon={<Send size={18} className="text-[#999]" />} label="Posts This Week" value={postsThisWeek} href="/content" />
          ) : (
            <StatCard icon={<BookOpen size={18} className="text-[#999]" />} label="KB Entries" value={kbCount} href="/knowledge-base" />
          )}
        </div>
      )}

      {/* Social Stat Cards */}
      {hasSocial && (
        <div className={`grid grid-cols-2 md:grid-cols-${hasReceptionist ? '3' : '4'} gap-4 mb-4`}>
          {!hasReceptionist && (
            <StatCard icon={<Send size={18} className="text-[#999]" />} label="Posts This Week" value={postsThisWeek} href="/content" />
          )}
          <StatCard icon={<Heart size={18} className="text-[#999]" />} label="Total Engagement" value={totalEngagement.toLocaleString()} href="/analytics" />
          <StatCard icon={<BarChart3 size={18} className="text-[#999]" />} label="Total Reach" value={totalReach.toLocaleString()} href="/analytics" />
          {hasReceptionist && (
            <StatCard icon={<BookOpen size={18} className="text-[#999]" />} label="KB Entries" value={kbCount} href="/knowledge-base" />
          )}
        </div>
      )}

      <div className="mb-8" />

      {/* Tom's Insights Card — only when receptionist + has new insights */}
      {hasReceptionist && newInsights.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] mb-8" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Sparkles size={16} className="text-amber-500" />
              </div>
              <h2 className="text-base font-semibold text-[#111]">Tom&apos;s Insights</h2>
              <span className="bg-[#FFD700] text-[#111] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {newInsights.length} new
              </span>
            </div>
            <Link href="/insights" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
              View all &rarr;
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {newInsights.map(insight => {
              const catColors: Record<string, string> = {
                revenue_opportunity: '#16A34A',
                operations: '#2563EB',
                customer_experience: '#9333EA',
                competitive_intel: '#DC2626',
              }
              const catLabels: Record<string, string> = {
                revenue_opportunity: 'Revenue',
                operations: 'Operations',
                customer_experience: 'Experience',
                competitive_intel: 'Intel',
              }
              const color = catColors[insight.category] ?? '#6B7280'
              return (
                <div key={insight.id} className="flex gap-3 px-5 py-3.5">
                  <div className="w-[3px] rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color, minHeight: 36 }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase" style={{ color }}>
                        {catLabels[insight.category] ?? insight.category}
                      </span>
                      {insight.priority === 'high' && (
                        <span className="text-[10px] font-bold text-red-600">● HIGH</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#111] leading-snug">{insight.title}</p>
                    <p className="text-xs text-[#777] line-clamp-2 mt-0.5">{insight.insight}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Call Volume Chart — only when receptionist is enabled */}
      {hasReceptionist && (
        <div className="mb-8">
          <CallVolumeChart data={chartData} />
        </div>
      )}

      {/* Two-column: Recent Calls + New Leads — only when receptionist */}
      {hasReceptionist && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Calls */}
          <div className="bg-white rounded-xl border border-[#e5e7eb]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#111]">Recent Calls</h2>
              <Link href="/calls" className="text-sm text-[#777] hover:text-[#111] transition-colors">
                View all &rarr;
              </Link>
            </div>
            {recentCalls.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Phone size={28} className="text-[#ccc] mx-auto mb-3" />
                <p className="text-sm text-[#777]">No calls yet</p>
                <p className="text-xs text-[#999] mt-1">{agentName} will log every call automatically.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentCalls.map((call) => (
                  <li key={call.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium text-[#111] truncate">
                          {call.caller_name ?? call.caller_number ?? 'Unknown'}
                        </p>
                        {call.sentiment && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${sentimentColor(call.sentiment)} hidden sm:inline-flex`}>
                            {call.sentiment}
                          </span>
                        )}
                        {call.callback_promised && !call.callback_completed && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 hidden sm:inline-flex">
                            Callback requested
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#999] shrink-0">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </div>
                    {call.summary && (
                      <p className="mt-1 text-xs text-[#777] line-clamp-2">{call.summary}</p>
                    )}
                    <p className="mt-1 text-[10px] text-[#999]" suppressHydrationWarning>
                      {new Date(call.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* New Leads */}
          <div className="bg-white rounded-xl border border-[#e5e7eb]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#111]">New Leads</h2>
              <Link href="/leads" className="text-sm text-[#777] hover:text-[#111] transition-colors">
                View all &rarr;
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Target size={28} className="text-[#ccc] mx-auto mb-3" />
                <p className="text-sm text-[#777]">No new leads yet</p>
                <p className="text-xs text-[#999] mt-1">{agentName} will capture leads from every call.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDot(lead.urgency)}`} />
                      <p className="text-sm font-medium text-[#111] truncate">
                        {lead.name ?? lead.phone ?? 'Unknown'}
                      </p>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 uppercase">
                        New
                      </span>
                    </div>
                    {lead.service_interested && (
                      <p className="mt-1 text-xs text-[#777] ml-4">
                        Interested in: {lead.service_interested}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-[#999] ml-4" suppressHydrationWarning>
                      {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Quick Links — dynamic based on products */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#111] mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLinkCard href="/crm" icon={<Users size={20} className="text-[#777]" />} label="Manage Contacts" />
          {hasReceptionist && <QuickLinkCard href="/knowledge-base" icon={<BookOpen size={20} className="text-[#777]" />} label="Knowledge Base" />}
          {hasSocial && <QuickLinkCard href="/content" icon={<Send size={20} className="text-[#777]" />} label="Content Calendar" />}
          <QuickLinkCard href="/website-analytics" icon={<Globe size={20} className="text-[#777]" />} label="Website" />
          <QuickLinkCard href="/settings" icon={<Settings size={20} className="text-[#777]" />} label="Settings" />
        </div>
      </div>

      {/* Agent Status Bar — only when receptionist */}
      {hasReceptionist && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] px-5 py-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-[#111] font-medium">
                {lastCall
                  ? `${agentName} is active and answering your calls`
                  : `${agentName} is active and ready for your first call`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#999]">
              <span>{kbCount} knowledge base entries</span>
              {lastCall && (
                <span suppressHydrationWarning>Last call {(() => {
                  const diff = Date.now() - new Date(lastCall.created_at).getTime()
                  const mins = Math.floor(diff / 60000)
                  if (mins < 1) return 'just now'
                  if (mins < 60) return `${mins}m ago`
                  const hours = Math.floor(mins / 60)
                  if (hours < 24) return `${hours}h ago`
                  return `${Math.floor(hours / 24)}d ago`
                })()}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  highlight,
  subtitle,
  href,
  allClear,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  highlight?: boolean
  subtitle?: string
  href: string
  allClear?: boolean
}) {
  return (
    <Link
      href={href}
      className={`bg-white rounded-xl border p-4 relative block cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
        highlight ? 'border-amber-300' : 'border-[#e5e7eb]'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <span className="absolute top-3 right-3">{icon}</span>
      <p className="text-xs text-[#777] mb-1">{label}</p>
      <p className={`text-[28px] font-bold leading-tight ${allClear ? 'text-green-600 text-xl' : 'text-[#111]'}`}>{value}</p>
      {subtitle && (
        <p className="text-[10px] text-amber-600 font-medium mt-1">{subtitle}</p>
      )}
    </Link>
  )
}

function QuickLinkCard({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-[#e5e7eb] p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {icon}
      <span className="text-sm font-medium text-[#333]">{label}</span>
    </Link>
  )
}
