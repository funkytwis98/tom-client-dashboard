'use client'

interface PostStats {
  id: string
  status: string
  engagement_likes: number | null
  engagement_comments: number | null
  engagement_shares: number | null
  engagement_reach: number | null
  platforms: string[] | null
  created_at: string | null
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const cardCls = 'bg-white rounded-[14px] border border-[#e5e7eb] p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
  return (
    <div className={cardCls}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-[#111] mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsDashboard({ posts }: { posts: PostStats[] }) {
  const published = posts.filter(p => p.status === 'published')
  const scheduled = posts.filter(p => p.status === 'scheduled')
  const drafts = posts.filter(p => p.status === 'draft')

  const totalLikes = published.reduce((s, p) => s + (p.engagement_likes ?? 0), 0)
  const totalComments = published.reduce((s, p) => s + (p.engagement_comments ?? 0), 0)
  const totalShares = published.reduce((s, p) => s + (p.engagement_shares ?? 0), 0)
  const totalReach = published.reduce((s, p) => s + (p.engagement_reach ?? 0), 0)
  const totalEngagement = totalLikes + totalComments + totalShares

  // Platform breakdown
  const platformCounts: Record<string, number> = {}
  posts.forEach(p => {
    (p.platforms ?? []).forEach(pl => {
      platformCounts[pl] = (platformCounts[pl] ?? 0) + 1
    })
  })

  const cardCls = 'bg-white rounded-[14px] border border-[#e5e7eb] p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'

  // Simple bar chart data - engagement by post (last 10 published)
  const chartPosts = published.slice(0, 10).reverse()
  const maxEngagement = Math.max(
    ...chartPosts.map(p => (p.engagement_likes ?? 0) + (p.engagement_comments ?? 0) + (p.engagement_shares ?? 0)),
    1
  )

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Posts" value={posts.length} sub={`${published.length} published`} />
        <StatCard label="Scheduled" value={scheduled.length} />
        <StatCard label="Drafts" value={drafts.length} />
        <StatCard label="Likes" value={totalLikes.toLocaleString()} />
        <StatCard label="Comments" value={totalComments.toLocaleString()} />
        <StatCard label="Shares" value={totalShares.toLocaleString()} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reach + Engagement summary */}
        <div className={cardCls}>
          <h2 className="text-sm font-bold text-[#111] mb-4">Engagement Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Reach</span>
              <span className="text-lg font-bold text-[#111]">{totalReach.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Engagement</span>
              <span className="text-lg font-bold text-[#111]">{totalEngagement.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Engagement / Post</span>
              <span className="text-lg font-bold text-[#111]">
                {published.length > 0 ? Math.round(totalEngagement / published.length).toLocaleString() : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Engagement Rate</span>
              <span className="text-lg font-bold text-[#FFD700]">
                {totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(1) + '%' : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className={cardCls}>
          <h2 className="text-sm font-bold text-[#111] mb-4">Posts by Platform</h2>
          {Object.keys(platformCounts).length === 0 ? (
            <p className="text-sm text-gray-500">No platform data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(platformCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([platform, count]) => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded px-2 py-1 w-8 text-center">
                      {platform.charAt(0).toUpperCase() + platform.slice(1, 2)}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 capitalize">{platform}</span>
                        <span className="text-gray-500">{count} posts</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FFD700] rounded-full"
                          style={{ width: `${(count / posts.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Engagement bar chart */}
      {chartPosts.length > 0 && (
        <div className={cardCls}>
          <h2 className="text-sm font-bold text-[#111] mb-4">Engagement per Post (Recent)</h2>
          <div className="flex items-end gap-2 h-40">
            {chartPosts.map(post => {
              const eng = (post.engagement_likes ?? 0) + (post.engagement_comments ?? 0) + (post.engagement_shares ?? 0)
              const height = Math.max((eng / maxEngagement) * 100, 4)
              const date = post.created_at ? new Date(post.created_at) : null
              return (
                <div key={post.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-medium">{eng}</span>
                  <div
                    className="w-full bg-[#FFD700] rounded-t-md transition-all"
                    style={{ height: `${height}%` }}
                    title={`${eng} engagements`}
                  />
                  <span className="text-[9px] text-gray-400">
                    {date ? `${date.getMonth() + 1}/${date.getDate()}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
