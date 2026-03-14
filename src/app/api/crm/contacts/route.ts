import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', ctx.clientId)
    .eq('status', 'confirmed')
    .order('last_interaction_at', { ascending: false, nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      client_id: ctx.clientId,
      name: body.name || null,
      phone: body.phone || '',
      email: body.email || '',
      vehicle_make: body.vehicle_make || '',
      vehicle_model: body.vehicle_model || '',
      vehicle_year: body.vehicle_year || '',
      tire_size: body.tire_size || '',
      preferred_contact: body.preferred_contact || '',
      birthday: body.birthday || '',
      notes: body.notes || '',
      status: 'confirmed',
      tags: body.tags || [],
      interaction_count: 0,
      first_contact_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
