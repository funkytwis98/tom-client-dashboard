import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { reportError } from '@/lib/monitoring/report-error'

function syncRetellInBackground(clientId: string) {
  updateRetellAgent(clientId).catch((err) => {
    console.error('[hours] Retell sync failed (non-blocking):', err)
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
    .from('business_hours')
    .select('*')
    .eq('client_id', ctx.clientId)
    .order('day_of_week', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: Array<{
    day_of_week: number
    is_open: boolean
    open_time: string
    close_time: string
  }> = await request.json()

  const supabase = await createClient()

  // Upsert all 7 days
  const rows = body.map((day) => ({
    client_id: ctx.clientId!,
    day_of_week: day.day_of_week,
    is_open: day.is_open,
    open_time: day.open_time,
    close_time: day.close_time,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('business_hours')
    .upsert(rows, { onConflict: 'client_id,day_of_week' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  syncRetellInBackground(ctx.clientId!)
  return NextResponse.json({ success: true })
}
