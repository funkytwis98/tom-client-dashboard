import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'
import { WebsiteRequestPortal } from '@/components/dashboard/WebsiteRequestPortal'

export default async function WebsitePage() {
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

  const { data: requests } = await supabase
    .from('website_requests')
    .select('id, request_type, subject, message, status, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Website</h1>
        <p className="text-sm text-gray-500 mt-1">Request changes to your website and track their progress</p>
      </div>
      <div className="max-w-3xl">
        <WebsiteRequestPortal clientId={clientId} initialRequests={requests ?? []} />
      </div>
    </div>
  )
}
