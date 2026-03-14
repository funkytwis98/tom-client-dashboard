import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { reportError } from '@/lib/monitoring/report-error'
import { cleanupStaleProposals } from '@/lib/learned/kb-cross-reference'

function syncRetellInBackground(clientId: string) {
  updateRetellAgent(clientId).catch((err) => {
    console.error('[services] Retell sync failed (non-blocking):', err)
    reportError({ type: 'retell_sync', message: String(err), clientId })
  })
}

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services_pricing')
    .select('*')
    .eq('client_id', ctx.clientId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const supabase = await createClient()

  // Get next sort_order
  const { data: existing } = await supabase
    .from('services_pricing')
    .select('sort_order')
    .eq('client_id', ctx.clientId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('services_pricing')
    .insert({
      client_id: ctx.clientId,
      service_name: body.service_name,
      price_text: body.price_text ?? '',
      notes: body.notes ?? '',
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  syncRetellInBackground(ctx.clientId)
  cleanupStaleProposals(ctx.clientId).catch(() => {})
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services_pricing')
    .update({
      service_name: body.service_name,
      price_text: body.price_text,
      notes: body.notes,
      sort_order: body.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .eq('client_id', ctx.clientId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  syncRetellInBackground(ctx.clientId)
  cleanupStaleProposals(ctx.clientId).catch(() => {})
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services_pricing')
    .delete()
    .eq('id', id)
    .eq('client_id', ctx.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  syncRetellInBackground(ctx.clientId)
  return NextResponse.json({ success: true })
}
