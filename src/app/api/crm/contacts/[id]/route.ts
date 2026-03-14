import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Fetch contact, notes, custom values, calls, and leads in parallel
  const [contactRes, notesRes, customValuesRes, callsRes, leadsRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('client_id', ctx.clientId)
      .single(),
    supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', id)
      .eq('client_id', ctx.clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_custom_values')
      .select('*')
      .eq('contact_id', id),
    supabase
      .from('calls')
      .select('id, caller_number, caller_name, status, duration_seconds, summary, sentiment, created_at')
      .eq('client_id', ctx.clientId),
    supabase
      .from('leads')
      .select('id, name, phone, status, service_interested, urgency, created_at')
      .eq('client_id', ctx.clientId),
  ])

  if (contactRes.error) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const contact = contactRes.data
  const phone = contact.phone

  // Filter calls and leads by phone
  const calls = (callsRes.data ?? []).filter(
    (c: { caller_number: string | null }) => c.caller_number === phone
  )
  const leads = (leadsRes.data ?? []).filter(
    (l: { phone: string | null }) => l.phone === phone
  )

  return NextResponse.json({
    contact,
    notes: notesRes.data ?? [],
    customValues: customValuesRes.data ?? [],
    calls,
    leads,
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createClient()

  const allowedFields = [
    'name', 'phone', 'email', 'vehicle_make', 'vehicle_model', 'vehicle_year',
    'tire_size', 'preferred_contact', 'birthday', 'notes', 'status', 'tags',
  ]
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .eq('client_id', ctx.clientId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('client_id', ctx.clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
