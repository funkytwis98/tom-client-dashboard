import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'
import { syncRetellInBackground } from '@/app/api/learned/_shared'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()

  // Fetch proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from('learning_proposals')
    .select('*')
    .eq('id', id)
    .eq('client_id', ctx.clientId)
    .single()

  if (fetchErr || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  // Optionally accept an answer override from the body
  let body: { answer?: string } = {}
  try {
    body = await request.json()
  } catch {
    // No body is fine
  }

  const entry = (proposal.proposed_entry ?? {}) as Record<string, unknown>
  const title = (entry.title as string) || proposal.title
  const content = body.answer || (entry.content as string) || proposal.description || ''
  const category = (entry.category as string) || 'faq'

  // Determine target table
  if (category === 'services' || category === 'pricing') {
    await supabase.from('services_pricing').insert({
      client_id: ctx.clientId,
      service_name: title,
      price_text: content,
      notes: '',
      is_active: true,
    })
  } else {
    await supabase.from('knowledge_base').insert({
      client_id: ctx.clientId,
      category: category === 'policies' ? 'policies' : 'faq',
      title,
      content,
      priority: 0,
      is_active: true,
    })
  }

  // Update proposal status
  await supabase
    .from('learning_proposals')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id)

  syncRetellInBackground(ctx.clientId)

  return NextResponse.json({ success: true })
}
