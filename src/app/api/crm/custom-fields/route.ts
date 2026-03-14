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
    .from('contact_custom_fields')
    .select('*')
    .eq('client_id', ctx.clientId)
    .order('sort_order', { ascending: true })

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
  if (!body.field_name?.trim()) {
    return NextResponse.json({ error: 'Field name is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contact_custom_fields')
    .insert({
      client_id: ctx.clientId,
      field_name: body.field_name.trim(),
      field_type: body.field_type || 'text',
      section_name: body.section_name || 'Custom',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fieldId = searchParams.get('id')
  if (!fieldId) {
    return NextResponse.json({ error: 'Field ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_custom_fields')
    .delete()
    .eq('id', fieldId)
    .eq('client_id', ctx.clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
