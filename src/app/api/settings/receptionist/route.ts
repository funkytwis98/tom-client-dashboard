import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { retellClient } from '@/lib/retell/client'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { z } from 'zod'

const Schema = z.object({
  clientId: z.string().uuid(),
  agent_name: z.string().min(1).max(50),
  greeting: z.string().max(500),
  voice_id: z.string().min(1),
  language: z.string().min(1),
})

export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { clientId, agent_name, greeting, voice_id, language } = parsed.data

  // Verify the user has access to this client
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, client_id')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role ?? 'admin'

  if (role === 'client_owner') {
    if (profile?.client_id !== clientId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  } else {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('org_id', org.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 403 })
    }
  }

  // Fetch current agent_config to detect what changed
  const serviceSupabase = createServiceClient()
  const { data: currentConfig } = await serviceSupabase
    .from('agent_config')
    .select('voice_id, agent_name, greeting')
    .eq('client_id', clientId)
    .single()

  // Save to Supabase
  const { error } = await serviceSupabase
    .from('agent_config')
    .update({
      agent_name,
      greeting: greeting || null,
      voice_id,
      language,
      updated_at: new Date().toISOString(),
    })
    .eq('client_id', clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sync changes to Retell
  let retellWarning: string | null = null
  try {
    const { data: clientData } = await serviceSupabase
      .from('clients')
      .select('retell_agent_id')
      .eq('id', clientId)
      .single()

    if (clientData?.retell_agent_id) {
      const voiceChanged = currentConfig?.voice_id !== voice_id
      const promptChanged = currentConfig?.agent_name !== agent_name || currentConfig?.greeting !== greeting

      // Update voice on the Retell agent if it changed
      if (voiceChanged) {
        await retellClient.agent.update(clientData.retell_agent_id, {
          voice_id,
        })
      }

      // Rebuild and push the LLM prompt if name or greeting changed
      if (promptChanged) {
        await updateRetellAgent(clientId)
      }
    }
  } catch (err) {
    console.error('Failed to sync to Retell:', err)
    retellWarning = 'Settings saved but voice sync to phone system failed. Changes will apply on next sync.'
  }

  return NextResponse.json({ success: true, warning: retellWarning })
}
