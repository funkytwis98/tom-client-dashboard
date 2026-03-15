'use client'

import { useState } from 'react'

interface Post {
  id: string
  client_id: string
  status: string
  caption: string | null
  hashtags: string | null
  platforms: string[] | null
  photo_url: string | null
  scheduled_for: string | null
  content_type: string | null
  source: string | null
  approval: string | null
  engagement_likes: number | null
  engagement_comments: number | null
  engagement_shares: number | null
  engagement_reach: number | null
  created_at: string | null
  updated_at: string | null
}

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published'

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700' },
  published: { bg: 'bg-green-50', text: 'text-green-700' },
}

const platformIcons: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  twitter: 'X',
  tiktok: 'TT',
  linkedin: 'LI',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ContentDashboard({ initialPosts }: { initialPosts: Post[] }) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = filter === 'all' ? initialPosts : initialPosts.filter(p => p.status === filter)

  // Group by status for display order: draft -> scheduled -> published
  const drafts = filtered.filter(p => p.status === 'draft')
  const scheduled = filtered.filter(p => p.status === 'scheduled')
  const published = filtered.filter(p => p.status === 'published')
  const grouped = [...drafts, ...scheduled, ...published]

  const cardCls = 'bg-white rounded-[14px] border border-[#e5e7eb] p-4 md:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'

  const counts = {
    all: initialPosts.length,
    draft: initialPosts.filter(p => p.status === 'draft').length,
    scheduled: initialPosts.filter(p => p.status === 'scheduled').length,
    published: initialPosts.filter(p => p.status === 'published').length,
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'scheduled', 'published'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-[#FFD700] text-[#111]'
                : 'bg-white border border-[#e5e7eb] text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {grouped.length === 0 ? (
        <div className={cardCls}>
          <p className="text-gray-500 text-sm text-center py-8">No posts yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grouped.map(post => {
            const colors = statusColors[post.status] ?? statusColors.draft
            return (
              <div key={post.id} className={cardCls + ' flex flex-col gap-3'}>
                {/* Header: status + platforms */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                    {post.status}
                  </span>
                  <div className="flex gap-1">
                    {(post.platforms ?? []).map(p => (
                      <span key={p} className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                        {platformIcons[p.toLowerCase()] ?? p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <p className="text-sm text-gray-800 line-clamp-3">
                  {post.caption || 'No caption'}
                </p>

                {/* Hashtags */}
                {post.hashtags && (
                  <p className="text-xs text-[#FFD700] font-medium truncate">
                    {post.hashtags}
                  </p>
                )}

                {/* Scheduled date */}
                {post.scheduled_for && (
                  <p className="text-xs text-gray-500">
                    Scheduled: {formatDate(post.scheduled_for)}
                  </p>
                )}

                {/* Approval */}
                {post.approval && (
                  <span className={`text-xs font-medium ${
                    post.approval === 'approved' ? 'text-green-600' :
                    post.approval === 'rejected' ? 'text-red-600' :
                    'text-amber-600'
                  }`}>
                    {post.approval.charAt(0).toUpperCase() + post.approval.slice(1)}
                  </span>
                )}

                {/* Engagement stats (for published) */}
                {post.status === 'published' && (
                  <div className="flex gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <span>{post.engagement_likes ?? 0} likes</span>
                    <span>{post.engagement_comments ?? 0} comments</span>
                    <span>{post.engagement_shares ?? 0} shares</span>
                  </div>
                )}

                {/* Footer date */}
                <p className="text-[11px] text-gray-400 mt-auto">
                  Created {formatDate(post.created_at)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
