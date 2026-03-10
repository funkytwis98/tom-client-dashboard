import { createClient } from '@/lib/supabase/server'
import { format, isPast } from 'date-fns'

const CLIENT_ID = 'c1000000-0000-0000-0000-000000000001'

interface SocialConnection {
  id: string
  platform: string
  account_name: string | null
  status: string
  page_id: string | null
  ig_user_id: string | null
  access_token: string | null
  token_expires_at: string | null
  permissions: string[] | null
  connected_at: string | null
  created_at: string
}

const PLATFORM_CONFIG: Record<string, { name: string; icon: string; color: string }> = {
  facebook: { name: 'Facebook', icon: '📘', color: 'blue' },
  instagram: { name: 'Instagram', icon: '📷', color: 'pink' },
}

export default async function SocialPage() {
  const supabase = await createClient()

  const [connectionsResult, postsResult] = await Promise.all([
    supabase
      .from('social_connections')
      .select('*')
      .eq('client_id', CLIENT_ID),
    supabase
      .from('posts')
      .select('status')
      .eq('client_id', CLIENT_ID),
  ])

  const connections: SocialConnection[] = connectionsResult.error ? [] : ((connectionsResult.data ?? []) as SocialConnection[])
  const allPosts = (postsResult.data ?? []) as { status: string }[]

  const connectedCount = connections.filter(c => c.status === 'connected').length
  const totalPosts = allPosts.length
  const publishedPosts = allPosts.filter(p => p.status === 'posted').length

  // Build map of connected platforms for easy lookup
  const connectedPlatforms = new Map(connections.map(c => [c.platform, c]))

  // Show both facebook and instagram cards regardless of connection status
  const platforms = ['facebook', 'instagram']

  const stats = [
    { label: 'Connected', value: connectedCount },
    { label: 'Total Posts', value: totalPosts },
    { label: 'Published', value: publishedPosts },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Social Connections</h1>
        <p className="text-sm text-gray-500 mt-1">Connected social media accounts</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {platforms.map(platform => {
          const config = PLATFORM_CONFIG[platform] ?? { name: platform, icon: '🔗', color: 'gray' }
          const connection = connectedPlatforms.get(platform)
          const isConnected = connection?.status === 'connected'
          const isExpired = connection?.status === 'token_expired'
          const tokenExpired = connection?.token_expires_at && isPast(new Date(connection.token_expires_at))

          return (
            <div key={platform} className="bg-white rounded-lg border border-gray-200 p-5">
              {/* Platform header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{config.icon}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{config.name}</h3>
                  {connection?.account_name && (
                    <p className="text-xs text-gray-500">{connection.account_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    isConnected && !tokenExpired ? 'bg-green-500' :
                    isExpired || tokenExpired ? 'bg-yellow-500' :
                    'bg-gray-300'
                  }`} />
                  <span className={`text-xs font-medium ${
                    isConnected && !tokenExpired ? 'text-green-700' :
                    isExpired || tokenExpired ? 'text-yellow-700' :
                    'text-gray-500'
                  }`}>
                    {isConnected && !tokenExpired ? 'Active' :
                     isExpired || tokenExpired ? 'Token Expired' :
                     'Not Connected'}
                  </span>
                </div>
              </div>

              {connection && isConnected ? (
                <>
                  {/* Token expiry warning */}
                  {tokenExpired && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <p className="text-xs text-yellow-800 font-medium">Token has expired</p>
                      <p className="text-xs text-yellow-700 mt-0.5">Contact your Tom Agency operator to reconnect this account.</p>
                    </div>
                  )}

                  {/* Connection details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {connection.page_id && (
                      <div>
                        <p className="text-gray-500">Page ID</p>
                        <p className="text-gray-900 font-mono truncate">{connection.page_id}</p>
                      </div>
                    )}
                    {connection.ig_user_id && (
                      <div>
                        <p className="text-gray-500">IG User ID</p>
                        <p className="text-gray-900 font-mono truncate">{connection.ig_user_id}</p>
                      </div>
                    )}
                    {connection.token_expires_at && (
                      <div>
                        <p className="text-gray-500">Token Expires</p>
                        <p className="text-gray-900">{format(new Date(connection.token_expires_at), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    {connection.permissions && (
                      <div>
                        <p className="text-gray-500">Permissions</p>
                        <p className="text-gray-900">{connection.permissions.length} granted</p>
                      </div>
                    )}
                    {connection.connected_at && (
                      <div>
                        <p className="text-gray-500">Connected</p>
                        <p className="text-gray-900">{format(new Date(connection.connected_at), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400">
                  This account is not connected yet. Contact your Tom Agency operator to set it up.
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Info box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600">
          <span className="font-medium">How connections work:</span> Tom uses these connected accounts to publish social media posts on your behalf. To connect or reconnect an account, contact your Tom Agency operator.
        </p>
      </div>
    </div>
  )
}
