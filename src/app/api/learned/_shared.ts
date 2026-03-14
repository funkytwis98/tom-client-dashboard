import { createClient } from '@/lib/supabase/server'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { reportError } from '@/lib/monitoring/report-error'

/**
 * Fire-and-forget Retell sync after KB changes.
 */
export async function syncRetellInBackground(clientId: string) {
  try {
    const supabase = await createClient()
    const { data: client } = await supabase
      .from('clients')
      .select('retell_agent_id')
      .eq('id', clientId)
      .single()

    if (!client?.retell_agent_id) {
      console.warn('[learned] Skipping Retell sync — no agent_id for client', clientId)
      return
    }

    await updateRetellAgent(clientId)
  } catch (err) {
    console.error('[learned] Retell sync failed (non-blocking):', err)
    reportError({
      type: 'retell_sync',
      message: String(err),
      clientId,
    })
  }
}
