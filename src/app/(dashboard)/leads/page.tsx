import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { LeadsCards } from '@/components/dashboard/LeadsCards'
import type { LeadWithCall } from '@/types/domain'

export default async function LeadsPage() {
  const ctx = await getUserContext()
  const clientId = ctx?.clientId

  if (!clientId) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">No client found.</p>
      </div>
    )
  }

  const supabase = await createClient()

  const [leadsRes, contactsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('*, call:calls(*)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('contacts')
      .select('id, phone, status')
      .eq('client_id', clientId)
      .eq('status', 'confirmed'),
  ])

  const leads: LeadWithCall[] = leadsRes.error ? [] : ((leadsRes.data ?? []) as LeadWithCall[])
  const agentName = ctx?.agentName ?? 'Your receptionist'

  // Build phone→contactId map for CRM link
  const contactMap: Record<string, string> = {}
  for (const c of contactsRes.data ?? []) {
    if (c.phone) contactMap[c.phone] = c.id
  }

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          Leads from phone calls and website form submissions
        </p>
      </div>
      <LeadsCards clientId={clientId} initialLeads={leads} agentName={agentName} contactMap={contactMap} />
    </div>
  )
}
