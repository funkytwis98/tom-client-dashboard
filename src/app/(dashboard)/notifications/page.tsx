import { createClient } from '@/lib/supabase/server'
import { NotificationInbox } from '@/components/dashboard/NotificationInbox'

const CLIENT_ID = 'c1000000-0000-0000-0000-000000000001'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('client_id', CLIENT_ID)
    .order('created_at', { ascending: false })

  const notifications = error ? [] : (data ?? [])

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Stay on top of calls, leads, and updates</p>
      </div>
      <NotificationInbox initialNotifications={notifications} />
    </div>
  )
}
