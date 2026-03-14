import { createServiceClient } from '@/lib/supabase/service'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'

/**
 * POST /api/analytics/track
 * Receives page view and event data from the embeddable analytics snippet.
 * Rate limited to 100 events per client per hour.
 */
export async function POST(req: Request): Promise<Response> {
  // Rate limit: 100 requests per hour per IP
  const rl = rateLimit(req, { limit: 100, windowMs: 3_600_000 })
  if (!rl.success) return rateLimitResponse(rl)

  // CORS headers for cross-origin snippet requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  let body: {
    client_id?: string
    event_type?: string
    page_url?: string
    referrer?: string
    event_label?: string
    metadata?: Record<string, unknown>
    visitor_id?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders })
  }

  const { client_id, event_type, page_url, referrer, event_label, metadata, visitor_id } = body

  // Validate required fields
  if (!client_id || !event_type || !page_url) {
    return Response.json(
      { error: 'Missing required fields: client_id, event_type, page_url' },
      { status: 400, headers: corsHeaders }
    )
  }

  // Validate event_type
  const validTypes = ['page_view', 'button_click', 'form_submit']
  if (!validTypes.includes(event_type)) {
    return Response.json(
      { error: `Invalid event_type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400, headers: corsHeaders }
    )
  }

  // Validate UUID format for client_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(client_id)) {
    return Response.json({ error: 'Invalid client_id format' }, { status: 400, headers: corsHeaders })
  }

  const supabase = createServiceClient()

  // Verify client exists
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .single()

  if (!client) {
    return Response.json({ error: 'Unknown client' }, { status: 404, headers: corsHeaders })
  }

  // Insert analytics event
  const { error } = await supabase.from('website_analytics').insert({
    client_id,
    event_type,
    page_url: page_url.substring(0, 2000), // truncate long URLs
    referrer: referrer?.substring(0, 2000) || null,
    event_label: event_label?.substring(0, 500) || null,
    metadata: metadata || null,
    visitor_id: visitor_id?.substring(0, 100) || null,
  })

  if (error) {
    console.error('[analytics/track] Insert error:', error)
    return Response.json({ error: 'Failed to record event' }, { status: 500, headers: corsHeaders })
  }

  return Response.json({ ok: true }, { status: 200, headers: corsHeaders })
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
