import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { SettingsForm } from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const ctx = await getUserContext()

  if (!ctx || !ctx.clientId) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-gray-500">Unable to load settings. Please log in again.</p>
      </div>
    )
  }

  // Fetch client and agent_config in parallel
  const [{ data: client }, { data: agentConfig }] = await Promise.all([
    supabase.from('clients').select('name, owner_name, owner_phone').eq('id', ctx.clientId).single(),
    supabase.from('agent_config').select('agent_name, greeting, voice_id, language').eq('client_id', ctx.clientId).single(),
  ])

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your business and receptionist settings</p>
      </div>

      <div className="max-w-2xl">
        <SettingsForm
          clientId={ctx.clientId}
          email={ctx.email}
          initialBusiness={{
            name: client?.name ?? '',
            owner_name: client?.owner_name ?? '',
            owner_phone: client?.owner_phone ?? '',
          }}
          initialReceptionist={{
            agent_name: agentConfig?.agent_name ?? '',
            greeting: agentConfig?.greeting ?? '',
            voice_id: agentConfig?.voice_id ?? '',
            language: agentConfig?.language ?? 'en-US',
          }}
        />
      </div>
    </div>
  )
}
