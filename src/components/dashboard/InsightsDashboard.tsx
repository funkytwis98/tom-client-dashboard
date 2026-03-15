'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Insight {
  id: string
  client_id: string
  category: string
  priority: string
  title: string
  insight: string
  source: string | null
  status: string
  reviewed_at: string | null
  created_at: string
  updated_at: string | null
}

type CategoryFilter = 'all' | 'revenue_opportunity' | 'operations' | 'customer_experience' | 'competitive_intel'

const CATEGORIES: { key: CategoryFilter; label: string; emoji: string; color: string; bg: string; border: string }[] = [
  { key: 'all', label: 'All', emoji: '', color: '', bg: '', border: '' },
  { key: 'revenue_opportunity', label: 'Revenue Opportunity', emoji: '\uD83D\uDCB0', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  { key: 'operations', label: 'Operations', emoji: '\u2699\uFE0F', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'customer_experience', label: 'Customer Experience', emoji: '\uD83E\uDD1D', color: '#9333EA', bg: '#FAF5FF', border: '#E9D5FF' },
  { key: 'competitive_intel', label: 'Competitive Intel', emoji: '\uD83D\uDCCA', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
]

const PRIORITY_STYLES: Record<string, { color: string; bg: string }> = {
  high: { color: '#DC2626', bg: '#FEF2F2' },
  medium: { color: '#D97706', bg: '#FFFBEB' },
  low: { color: '#6B7280', bg: '#F9FAFB' },
}

function getCategoryInfo(category: string) {
  return CATEGORIES.find(c => c.key === category) ?? CATEGORIES[0]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function InsightsDashboard({ initialInsights, agentName }: { initialInsights: Insight[]; agentName: string }) {
  const [insights, setInsights] = useState(initialInsights)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const filtered = filter === 'all' ? insights : insights.filter(i => i.category === filter)
  const newCount = insights.filter(i => i.status === 'new').length

  const categoryCounts: Record<string, number> = {}
  for (const i of insights) {
    categoryCounts[i.category] = (categoryCounts[i.category] ?? 0) + 1
  }

  async function updateInsight(id: string, status: 'acknowledged' | 'dismissed') {
    const now = new Date().toISOString()
    // Optimistic update
    if (status === 'dismissed') {
      setInsights(prev => prev.filter(i => i.id !== id))
    } else {
      setInsights(prev => prev.map(i => i.id === id ? { ...i, status, reviewed_at: now, updated_at: now } : i))
    }
    showToast(status === 'acknowledged' ? 'Insight acknowledged \u2713' : 'Insight dismissed')

    const supabase = createClient()
    await supabase
      .from('business_insights')
      .update({ status, reviewed_at: now, updated_at: now })
      .eq('id', id)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{agentName}&apos;s Insights</h1>
          <p className="text-sm text-gray-500 mt-1">What {agentName} has learned about your business from customer calls.</p>
        </div>
        {newCount > 0 && (
          <span className="bg-[#FFD700] text-[#111] text-xs font-bold px-3 py-1 rounded-full">
            {newCount} new
          </span>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => {
          const count = cat.key === 'all' ? insights.length : (categoryCounts[cat.key] ?? 0)
          const isActive = filter === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#111] text-white'
                  : 'bg-white border border-[#e5e7eb] text-[#666] hover:bg-gray-50'
              }`}
            >
              {cat.emoji ? `${cat.emoji} ` : ''}{cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Insights list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-gray-400 text-sm">
            {agentName} hasn&apos;t generated any insights yet. As {agentName} handles more calls, business insights will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(insight => {
            const cat = getCategoryInfo(insight.category)
            const priority = PRIORITY_STYLES[insight.priority] ?? PRIORITY_STYLES.medium
            const isNew = insight.status === 'new'

            return (
              <div
                key={insight.id}
                className="bg-white rounded-xl border p-5"
                style={{
                  borderColor: isNew && cat.border ? cat.border : '#e5e7eb',
                  boxShadow: isNew ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {/* Category badge */}
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: cat.color, backgroundColor: cat.bg, border: `1px solid ${cat.border}` }}
                  >
                    {cat.emoji} {cat.label}
                  </span>
                  {/* Priority badge */}
                  <span
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                    style={{ color: priority.color, backgroundColor: priority.bg }}
                  >
                    {insight.priority}
                  </span>
                  {/* NEW badge */}
                  {isNew && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FFD700] text-[#111]">
                      NEW
                    </span>
                  )}
                  <span className="text-xs text-[#aaa] ml-auto shrink-0" suppressHydrationWarning>
                    {timeAgo(insight.created_at)}
                  </span>
                </div>

                {/* Title + body */}
                <h3 className="text-base font-bold text-[#111] mb-1">{insight.title}</h3>
                <p className="text-sm text-[#555] leading-relaxed mb-2">{insight.insight}</p>

                {/* Source */}
                {insight.source && (
                  <p className="text-xs text-[#aaa] italic mb-3">Source: {insight.source}</p>
                )}

                {/* Actions for new items */}
                {isNew && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => updateInsight(insight.id, 'acknowledged')}
                      className="bg-[#111] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#333] transition-colors"
                    >
                      Got it ✓
                    </button>
                    <button
                      onClick={() => updateInsight(insight.id, 'dismissed')}
                      className="bg-gray-100 text-[#666] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-[#111] text-white font-medium px-5 py-3 rounded-xl shadow-lg"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
