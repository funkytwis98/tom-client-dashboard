import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

const CLIENT_ID = 'c1000000-0000-0000-0000-000000000001'

interface Post {
  id: string
  caption: string | null
  hashtags: string | null
  platforms: string[] | null
  status: string
  content_type: string | null
  source: string | null
  photo_url: string | null
  scheduled_for: string | null
  engagement_likes: number | null
  engagement_comments: number | null
  engagement_shares: number | null
  engagement_reach: number | null
  created_at: string
}

interface PostsPageProps {
  searchParams: Promise<{ status?: string }>
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  posted: { label: 'Published', className: 'bg-green-100 text-green-800' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📷',
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select('*')
    .eq('client_id', CLIENT_ID)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  const posts: Post[] = error ? [] : ((data ?? []) as Post[])

  // Compute stats from all posts (unfiltered)
  const allPostsResult = await supabase
    .from('posts')
    .select('status, engagement_likes, engagement_comments, engagement_shares')
    .eq('client_id', CLIENT_ID)

  const allPosts = (allPostsResult.data ?? []) as Post[]
  const totalPosts = allPosts.length
  const drafts = allPosts.filter(p => p.status === 'draft').length
  const published = allPosts.filter(p => p.status === 'posted').length
  let totalEngagement = 0
  for (const p of allPosts) {
    totalEngagement += (p.engagement_likes ?? 0) + (p.engagement_comments ?? 0) + (p.engagement_shares ?? 0)
  }

  const activeStatus = status ?? 'all'

  function filterHref(s: string) {
    return s === 'all' ? '/posts' : `/posts?status=${s}`
  }

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'posted', label: 'Published' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'rejected', label: 'Rejected' },
  ]

  const stats = [
    { label: 'Total Posts', value: totalPosts },
    { label: 'Drafts', value: drafts },
    { label: 'Published', value: published },
    { label: 'Total Engagement', value: totalEngagement },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Posts</h1>
        <p className="text-sm text-gray-500 mt-1">Social media posts managed by Tom</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 flex-wrap mb-4 md:mb-6">
        <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
        {statusFilters.map(f => (
          <Link
            key={f.value}
            href={filterHref(f.value)}
            className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
              activeStatus === f.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="text-center py-12 px-4">
            <div className="mx-auto h-12 w-12 text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-medium text-gray-900">No posts yet</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Tom will create social media posts for your business automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(post => {
            const badge = STATUS_BADGE[post.status] ?? { label: post.status, className: 'bg-gray-100 text-gray-800' }
            const engagement = (post.engagement_likes ?? 0) + (post.engagement_comments ?? 0) + (post.engagement_shares ?? 0)

            return (
              <div key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {post.photo_url && (
                  <img src={post.photo_url} alt="" className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    {post.content_type && (
                      <span className="text-xs text-gray-500">{post.content_type}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-sm text-gray-700 line-clamp-4 mb-2">{post.caption}</p>
                  )}

                  {/* Hashtags */}
                  {post.hashtags && (
                    <p className="text-xs text-blue-600 mb-3">{post.hashtags}</p>
                  )}

                  {/* Platforms */}
                  <div className="flex items-center gap-2 mb-3">
                    {(post.platforms ?? []).map(p => (
                      <span key={p} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {PLATFORM_ICONS[p] ?? ''} {p}
                      </span>
                    ))}
                  </div>

                  {/* Engagement for posted items */}
                  {post.status === 'posted' && engagement > 0 && (
                    <div className="flex items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
                      {post.engagement_likes ? <span>❤️ {post.engagement_likes}</span> : null}
                      {post.engagement_comments ? <span>💬 {post.engagement_comments}</span> : null}
                      {post.engagement_shares ? <span>🔄 {post.engagement_shares}</span> : null}
                      {post.engagement_reach ? <span>👁 {post.engagement_reach}</span> : null}
                    </div>
                  )}

                  {/* Scheduled date */}
                  {post.status === 'scheduled' && post.scheduled_for && (
                    <p className="text-xs text-blue-600 border-t border-gray-100 pt-2">
                      Scheduled for {format(new Date(post.scheduled_for), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}

                  {/* Source */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    {post.source === 'auto-generated' ? '🤖 Auto' : '👤 Manual'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
