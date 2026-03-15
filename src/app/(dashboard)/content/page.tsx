import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'
import ContentDashboard from '@/components/dashboard/ContentDashboard'

export default async function ContentPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/login')
  if (!ctx.clientId) redirect('/')

  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('client_id', ctx.clientId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Content</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your social media posts and content calendar</p>
      </div>
      <ContentDashboard initialPosts={posts ?? []} />
    </div>
  )
}
