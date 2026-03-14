import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params

  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = ctx.clientId

  // Look up the lead to get its call_id
  const { data: lead } = await supabase
    .from('leads')
    .select('call_id')
    .eq('id', leadId)
    .eq('client_id', clientId)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Delete the lead
  const { error: leadError } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('client_id', clientId)

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 })
  }

  // Delete the associated call if it exists
  if (lead.call_id) {
    await supabase
      .from('calls')
      .delete()
      .eq('id', lead.call_id)
      .eq('client_id', clientId)
  }

  return NextResponse.json({ success: true })
}
