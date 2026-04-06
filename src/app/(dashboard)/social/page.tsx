import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SocialDashboard from './SocialDashboard'

export default async function SocialPage() {
  const ctx = await getUserContext()

  if (!ctx || !ctx.clientId) {
    redirect('/')
  }

  const hasSocial = (ctx.productsEnabled ?? []).includes('social')
  if (!hasSocial) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch or auto-create social_settings for this client
  let { data: settings } = await supabase
    .from('social_settings')
    .select('*')
    .eq('client_id', ctx.clientId)
    .single()

  if (!settings) {
    const { data: created } = await supabase
      .from('social_settings')
      .insert({
        client_id: ctx.clientId,
        platforms: ['facebook', 'instagram'],
        posting_frequency: '3_per_week',
        preferred_times: ['9:00 AM', '6:00 PM'],
        tone: null,
        topics_to_avoid: null,
      })
      .select()
      .single()

    settings = created
  }

  return (
    <SocialDashboard
      clientId={ctx.clientId}
      initialSettings={settings}
    />
  )
}
