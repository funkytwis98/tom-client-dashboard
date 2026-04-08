'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/dashboard/Toast'

interface PublishedPost {
  id: string
  platform: string | null
  caption: string | null
  image_url: string | null
  published_at: string | null
  created_at: string
}

interface PostAnalytics {
  post_id: string
  likes: number | null
  comments: number | null
  shares: number | null
  reach: number | null
}

function platformBadge(platform: string | null) {
  if (!platform) return null
  const p = platform.toLowerCase()
  if (p.includes('facebook') && p.includes('instagram')) {
    return <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Facebook + Instagram</span>
  }
  if (p.includes('instagram')) {
    return <span className="inline-flex items-center rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700">Instagram</span>
  }
  if (p.includes('facebook')) {
    return <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Facebook</span>
  }
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{platform}</span>
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StatPill({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
      <span className="font-medium">{value.toLocaleString()}</span>
      <span className="text-gray-400">{label}</span>
    </span>
  )
}

export default function PostHistory({ clientId }: { clientId: string }) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [posts, setPosts] = useState<PublishedPost[]>([])
  const [analytics, setAnalytics] = useState<Record<string, PostAnalytics>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Load published posts
      const { data: postsData, error: postsError } = await supabase
        .from('social_posts')
        .select('id, platform, caption, image_url, published_at, created_at')
        .eq('client_id', clientId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (postsError) showToast('Failed to load post history', 'error')
      setPosts(postsData ?? [])

      // Try to load analytics (table may not exist yet)
      if (postsData && postsData.length > 0) {
        const ids = postsData.map((p) => p.id)
        const { data: analyticsData } = await supabase
          .from('social_analytics')
          .select('post_id, likes, comments, shares, reach')
          .in('post_id', ids)

        if (analyticsData) {
          const map: Record<string, PostAnalytics> = {}
          for (const a of analyticsData) {
            map[a.post_id] = a
          }
          setAnalytics(map)
        }
      }

      setLoading(false)
    }
    load()
  }, [clientId])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">Loading post history...</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">No published posts yet</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Once posts are published, they&apos;ll appear here with engagement stats.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const stats = analytics[post.id]
        const hasStats = stats && (stats.likes != null || stats.comments != null || stats.shares != null || stats.reach != null)

        return (
          <div
            key={post.id}
            className="bg-white rounded-[14px] border border-[#e5e7eb] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                Published
              </span>
              {platformBadge(post.platform)}
              {post.published_at && (
                <span className="text-xs text-gray-400">{formatDate(post.published_at)}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                {post.caption && (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
                )}
              </div>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                />
              )}
            </div>

            {/* Engagement stats */}
            <div className="mt-3">
              {hasStats ? (
                <div className="flex flex-wrap gap-2">
                  <StatPill label="likes" value={stats.likes} />
                  <StatPill label="comments" value={stats.comments} />
                  <StatPill label="shares" value={stats.shares} />
                  <StatPill label="reach" value={stats.reach} />
                </div>
              ) : (
                <p className="text-xs text-gray-400">Stats coming soon</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
