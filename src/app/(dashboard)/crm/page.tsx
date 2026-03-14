import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { CRMContactList } from '@/components/dashboard/CRMContactList'

export default async function CRMPage() {
  const ctx = await getUserContext()
  const clientId = ctx?.clientId

  if (!clientId) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="text-sm text-gray-500 mt-1">No client found.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'confirmed')
    .order('last_interaction_at', { ascending: false, nullsFirst: false })

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <CRMContactList initialContacts={data ?? []} />
    </div>
  )
}
