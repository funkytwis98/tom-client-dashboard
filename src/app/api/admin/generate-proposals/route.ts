import { env } from '@/lib/utils/env'
import { generateProposalsForClient } from '@/lib/learned/generate-proposals'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'

/**
 * POST /api/admin/generate-proposals
 * Admin endpoint to trigger proposal generation for a specific client.
 * Requires: Authorization: Bearer <REVALIDATE_SECRET>
 * Body: { client_id: string }
 */
export async function POST(req: Request): Promise<Response> {
  const rl = rateLimit(req, { limit: 5, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl)

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.revalidateSecret()}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const clientId = body.client_id
  if (!clientId) {
    return Response.json({ error: 'client_id required' }, { status: 400 })
  }

  const result = await generateProposalsForClient(clientId)
  return Response.json(result)
}
