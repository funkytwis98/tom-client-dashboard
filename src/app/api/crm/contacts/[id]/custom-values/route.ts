import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: Record<string, string> = await req.json()
  const supabase = await createClient()

  const upserts = Object.entries(body).map(([fieldId, value]) => ({
    contact_id: contactId,
    field_id: fieldId,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('contact_custom_values')
    .upsert(upserts, { onConflict: 'contact_id,field_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
