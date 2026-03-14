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
    name?: string
    email?: string
    phone?: string
    message?: string
    service?: string
    page_url?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders })
  }

  const { client_id, name, email, phone, message, service, page_url } = body

  if (!client_id) {
    return Response.json({ error: 'Missing client_id' }, { status: 400, headers: corsHeaders })
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

  // 1. Insert into website_analytics as form_submission event
  await supabase.from('website_analytics').insert({
    client_id,
    event_type: 'form_submission',
    page_url: page_url?.substring(0, 2000) || '/contact',
    metadata: { name, email, phone, message, service },
    visitor_id: null,
  })

  // 2. Insert into leads
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      client_id,
      call_id: null,
      name: name || null,
      phone: phone || null,
      email: email || null,
      service_interested: service || 'Website Inquiry',
      notes: message || null,
      source: 'website',
      urgency: 'medium',
      status: 'new',
      owner_notified: false,
    })
    .select('id')
    .single()

  if (leadError) {
    console.error('[webhooks/form-submission] Lead insert error:', leadError)
    return Response.json({ error: 'Failed to create lead' }, { status: 500, headers: corsHeaders })
  }

  return Response.json(
    { success: true, lead_id: lead.id },
    { status: 200, headers: corsHeaders }
  )
}
