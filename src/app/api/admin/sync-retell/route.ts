import { env } from '@/lib/utils/env'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'

/**
 * POST /api/admin/sync-retell
 * Triggers a Retell agent prompt sync for a given client.
 * Rebuilds the system prompt from the knowledge base and pushes it to Retell.
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

  try {
    await updateRetellAgent(clientId)
    return Response.json({ success: true, message: 'Retell agent synced' })
  } catch (err) {
    console.error('[sync-retell] Error:', err)
    return Response.json(
      { error: 'Sync failed', detail: String(err) },
      { status: 500 },
    )
  }
}
