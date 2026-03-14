import { createServiceClient } from '@/lib/supabase/service'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
  })
}

export async function POST(req: Request): Promise<Response> {
  let body: {
    client_id?: string
    event_type?: string
    page_url?: string
    referrer?: string
    visitor_id?: string
    metadata?: Record<string, unknown>
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders })
  }

  const { client_id, event_type, page_url, referrer, visitor_id, metadata } = body

  if (!client_id || !event_type || !page_url) {
    return Response.json(
      { error: 'Missing required fields: client_id, event_type, page_url' },
      { status: 400, headers: corsHeaders }
    )
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(client_id)) {
    return Response.json({ error: 'Invalid client_id' }, { status: 400, headers: corsHeaders })
  }

  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .single()

  if (!client) {
    return Response.json({ error: 'Unknown client' }, { status: 404, headers: corsHeaders })
  }

  const { error } = await supabase.from('website_analytics').insert({
    client_id,
    event_type,
    page_url: page_url.substring(0, 2000),
    referrer: referrer?.substring(0, 2000) || null,
    metadata: metadata || null,
    visitor_id: visitor_id?.substring(0, 100) || null,
  })

  if (error) {
    console.error('[webhooks/website-analytics] Insert error:', error)
    return Response.json({ error: 'Failed to record event' }, { status: 500, headers: corsHeaders })
  }

  return Response.json({ ok: true }, { status: 200, headers: corsHeaders })
}
