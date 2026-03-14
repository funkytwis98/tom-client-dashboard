import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'

export async function GET(): Promise<Response> {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('website_requests')
    .select('*')
    .eq('client_id', ctx.clientId)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    request_type?: string
    subject?: string
    message?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { request_type, subject, message } = body

  if (!subject || !message) {
    return Response.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const validTypes = ['update', 'bug', 'suggestion', 'general']
  const type = validTypes.includes(request_type || '') ? request_type : 'general'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('website_requests')
    .insert({
      client_id: ctx.clientId,
      request_type: type,
      subject,
      message,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
