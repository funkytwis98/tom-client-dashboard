import { env } from '@/lib/utils/env'
import { retellClient } from '@/lib/retell/client'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'

/**
 * POST /api/admin/sync-voice
 * Fetches the current voice_id from Retell for a client's agent and updates the DB to match.
 *
 * Requires: Authorization: Bearer <REVALIDATE_SECRET>
 * Body: { "client_id": "..." }
 */
export async function POST(req: Request): Promise<Response> {
  const rl = rateLimit(req, { limit: 5, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl)

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.revalidateSecret()}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { client_id?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const clientId = body.client_id
  if (!clientId) {
    return Response.json({ error: 'client_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get the client's Retell agent ID
  const { data: client } = await supabase
    .from('clients')
    .select('retell_agent_id')
    .eq('id', clientId)
    .single()

  if (!client?.retell_agent_id) {
    return Response.json({ error: 'Client has no Retell agent' }, { status: 404 })
  }

  try {
    // Fetch the actual voice from Retell
    const agent = await retellClient.agent.retrieve(client.retell_agent_id)
    const retellVoiceId = agent.voice_id

    // Update DB to match Retell
    const { error } = await supabase
      .from('agent_config')
      .update({ voice_id: retellVoiceId, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      voice_id: retellVoiceId,
      message: `DB updated to match Retell voice: ${retellVoiceId}`,
    })
  } catch (err) {
    console.error('[sync-voice] Error:', err)
    return Response.json({ error: 'Sync failed', detail: String(err) }, { status: 500 })
  }
}
