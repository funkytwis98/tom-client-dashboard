import { createClient } from '@/lib/supabase/server'
import { ConversationView } from '@/components/dashboard/ConversationView'

const CLIENT_ID = 'c1000000-0000-0000-0000-000000000001'

export default async function ConversationsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('client_id', CLIENT_ID)
    .order('created_at', { ascending: true })

  const messages = error ? [] : (data ?? [])

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-sm text-gray-500 mt-1">SMS messages between you and Sarah</p>
      </div>
      <ConversationView initialMessages={messages} />
    </div>
  )
}
