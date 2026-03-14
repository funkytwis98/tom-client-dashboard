'use client'

import { useState, useTransition } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  Globe,
  Users,
  FileText,
  Inbox,
  ArrowUpCircle,
  ExternalLink,
  MessageSquarePlus,
  ChevronDown,
  X,
} from 'lucide-react'
import { useToast } from '@/components/dashboard/Toast'

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

interface Props {
  websiteUrl: string | null
  visitorsThisWeek: number
  pageViewsThisWeek: number
  formSubmissionCount: number
  topPage: string
  chartData: { date: string; visitors: number }[]
  formSubmissions: FormSubmission[]
  websiteRequests: WebsiteRequest[]
}

const cardStyle = {
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  borderRadius: 14,
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  update: 'Update Content',
  bug: 'Report Bug',
  suggestion: 'Suggestion',
  general: 'General',
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fffbeb', text: '#b45309' },
  in_progress: { bg: '#eff6ff', text: '#2563eb' },
  completed: { bg: '#f0fdf4', text: '#16a34a' },
}

export function WebsiteAnalyticsDashboard({
  websiteUrl,
  visitorsThisWeek,
  pageViewsThisWeek,
  formSubmissionCount,
  topPage,
  chartData,
  formSubmissions,
  websiteRequests: initialRequests,
}: Props) {
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requests, setRequests] = useState(initialRequests)

  const toggleRead = (id: string) => {
    setReadIds(curr => {
      const next = new Set(curr)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tickInterval = Math.max(1, Math.floor(chartData.length / 5))
  const allZeroChart = chartData.every((d) => d.visitors === 0)

  return (
    <div className="space-y-6">
      {/* Section 1: Website Status Card */}
      <div className="bg-white border border-[#e5e7eb] p-[22px_24px]" style={cardStyle}>
        {websiteUrl ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Globe size={24} className="text-[#777]" />
              <div>
                <p className="text-sm font-semibold text-[#111]">Your Website</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    Live
                  </span>
                </div>
              </div>
            </div>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#2563eb] hover:underline hidden md:block truncate max-w-[300px]"
            >
              {websiteUrl.replace(/^https?:\/\//, '')}
            </a>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold no-underline shrink-0"
              style={{
                backgroundColor: '#FFD700',
                color: '#111',
                borderRadius: 10,
                padding: '10px 20px',
              }}
            >
              <ExternalLink size={15} />
              Visit Website
            </a>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Globe size={24} className="text-[#777]" />
            <div>
              <p className="text-sm font-semibold text-[#111]">No website connected yet</p>
              <p className="text-sm text-[#777] mt-1">
                Ask your Tom Agency rep to set this up. Once connected, you&apos;ll see visitor stats and form submissions here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Quick Actions Row */}
      {websiteUrl && (
        <div className="grid grid-cols-2 gap-4">
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-[#e5e7eb] p-4 flex items-center justify-center gap-2 text-sm font-semibold no-underline hover:border-[#FFD700] transition-colors"
            style={{ ...cardStyle, color: '#111', border: '2px solid #FFD700' }}
          >
            <ExternalLink size={16} className="text-[#b8960a]" />
            Visit Website
          </a>
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-white border border-[#e5e7eb] p-4 flex items-center justify-center gap-2 text-sm font-semibold hover:border-[#999] transition-colors cursor-pointer"
            style={cardStyle}
          >
            <MessageSquarePlus size={16} className="text-[#777]" />
            Request Changes
          </button>
        </div>
      )}

      {/* Section 3: Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={18} className="text-[#999]" />} label="Visitors This Week" value={visitorsThisWeek} />
        <StatCard icon={<FileText size={18} className="text-[#999]" />} label="Page Views This Week" value={pageViewsThisWeek} />
        <StatCard icon={<Inbox size={18} className="text-[#999]" />} label="Form Submissions" value={formSubmissionCount} />
        <StatCard icon={<ArrowUpCircle size={18} className="text-[#999]" />} label="Top Page" value={topPage} isText />
      </div>

      {/* Visitor Chart */}
      <div className="bg-white border border-[#e5e7eb] p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#111]">Visitors</h3>
          <span className="text-sm text-[#999]">Last 14 days</span>
        </div>
        {allZeroChart ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-[#999]">
            Add the tracking script to your website to start seeing visitor data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [value, 'Visitors']}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any) => String(label)}
              />
              <Bar dataKey="visitors" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.visitors > 0 ? '#FFD700' : '#1C1C1F'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Section 4: Form Submissions Inbox */}
      <div className="bg-white border border-[#e5e7eb]" style={cardStyle}>
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center gap-2">
          <h3 className="text-base font-semibold text-[#111]">Form Submissions</h3>
          {formSubmissionCount > 0 && (
            <span className="bg-[#FFD700] text-[#111] text-xs font-bold px-2 py-0.5 rounded-full">
              {formSubmissionCount}
            </span>
          )}
        </div>

        {formSubmissions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Inbox size={28} className="text-[#ccc] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#777]">No form submissions yet</p>
            <p className="text-xs text-[#999] mt-1">
              When someone fills out the contact form on your website, their message will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {formSubmissions.map((sub) => {
              const meta = sub.metadata || {}
              const name = String(meta.name || meta.full_name || 'Unknown')
              const email = String(meta.email || '')
              const phone = String(meta.phone || '')
              const message = String(meta.message || meta.body || meta.comment || '')
              const service = String(meta.service || '')
              const isRead = readIds.has(sub.id)

              return (
                <li key={sub.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#111] truncate">{name}</p>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer select-none ${
                            isRead
                              ? 'bg-gray-100 text-[#999]'
                              : 'bg-green-50 text-green-700'
                          }`}
                          onClick={() => toggleRead(sub.id)}
                        >
                          {isRead ? 'Read' : 'New'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {email && (
                          <a href={`mailto:${email}`} className="text-xs text-[#2563eb] hover:underline no-underline">
                            {email}
                          </a>
                        )}
                        {phone && (
                          <a href={`tel:${phone}`} className="text-xs text-[#2563eb] hover:underline no-underline">
                            {phone}
                          </a>
                        )}
                      </div>
                      {message && (
                        <div
                          className="mt-2 text-sm text-[#555] leading-relaxed line-clamp-3"
                          style={{
                            backgroundColor: '#f9fafb',
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            padding: '8px 12px',
                          }}
                        >
                          {message}
                        </div>
                      )}
                      {service && (
                        <span
                          className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#fef9e7', color: '#92700a', border: '1px solid #ebe5d3' }}
                        >
                          {service}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#999] shrink-0 mt-0.5" suppressHydrationWarning>
                      {new Date(sub.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Section 5: Website Change Requests */}
      <div className="bg-white border border-[#e5e7eb]" style={cardStyle}>
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center gap-2">
          <h3 className="text-base font-semibold text-[#111]">Change Requests</h3>
          {requests.length > 0 && (
            <span className="bg-gray-100 text-[#666] text-xs font-bold px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </div>

        {requests.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <MessageSquarePlus size={28} className="text-[#ccc] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#777]">No change requests yet</p>
            <p className="text-xs text-[#999] mt-1">
              Use the &quot;Request Changes&quot; button to submit updates or suggestions for your website.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {requests.map((req) => {
              const statusStyle = STATUS_STYLES[req.status] || STATUS_STYLES.pending
              return (
                <li key={req.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#111] truncate">{req.subject}</p>
                    <p className="text-xs text-[#999] mt-0.5">
                      {REQUEST_TYPE_LABELS[req.request_type] || 'General'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#999]" suppressHydrationWarning>
                      {new Date(req.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Request Changes Modal */}
      {showRequestModal && (
        <RequestModal
          onClose={() => setShowRequestModal(false)}
          onCreated={(req) => setRequests(curr => [req, ...curr])}
        />
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  isText,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  isText?: boolean
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] p-4 relative" style={cardStyle}>
      <span className="absolute top-3 right-3">{icon}</span>
      <p className="text-xs text-[#777] mb-1">{label}</p>
      <p
        className={`font-bold text-[#111] leading-tight ${
          isText ? 'text-sm mt-2 truncate pr-6' : 'text-[28px]'
        }`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

function RequestModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (req: WebsiteRequest) => void
}) {
  const [requestType, setRequestType] = useState('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/website-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_type: requestType, subject, message }),
        })
        if (!res.ok) {
          showToast('Failed to submit request', 'error')
          return
        }
        const data = await res.json()
        onCreated(data)
        showToast('Request submitted')
        onClose()
      } catch {
        showToast('Failed to submit request', 'error')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg mx-4"
        style={{ borderRadius: 14, padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#111]">Request Changes</h3>
          <button onClick={onClose} className="text-[#999] hover:text-[#333]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">Request Type</label>
            <div className="relative">
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full text-sm bg-white border border-[#e5e7eb] rounded-lg p-3 pr-10 appearance-none outline-none focus:border-[#FFD700]"
              >
                <option value="update">Update Content</option>
                <option value="bug">Report Bug</option>
                <option value="suggestion">Suggestion</option>
                <option value="general">General</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Update phone number on contact page"
              className="w-full text-sm bg-white border border-[#e5e7eb] rounded-lg p-3 outline-none focus:border-[#FFD700]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">Message / Details</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you'd like changed..."
              rows={4}
              className="w-full text-sm bg-white border border-[#e5e7eb] rounded-lg p-3 outline-none focus:border-[#FFD700] resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !subject.trim() || !message.trim()}
            className="w-full text-sm font-semibold py-3 rounded-lg disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#FFD700', color: '#111' }}
          >
            {isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
