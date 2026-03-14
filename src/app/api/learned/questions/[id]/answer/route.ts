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
  const body = await request.json()
  const answer = body.answer?.trim()

  if (!answer) {
    return NextResponse.json({ error: 'answer is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch the question
  const { data: question, error: fetchErr } = await supabase
    .from('unanswered_questions')
    .select('*')
    .eq('id', id)
    .eq('client_id', ctx.clientId)
    .single()

  if (fetchErr || !question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  // Create FAQ entry in knowledge_base
  const { data: kbEntry, error: kbErr } = await supabase
    .from('knowledge_base')
    .insert({
      client_id: ctx.clientId,
      category: 'faq',
      title: question.question,
      content: answer,
      priority: 0,
      is_active: true,
    })
    .select('id')
    .single()

  if (kbErr) {
    return NextResponse.json({ error: kbErr.message }, { status: 500 })
  }

  // Update the unanswered question
  await supabase
    .from('unanswered_questions')
    .update({
      answer,
      status: 'answered',
      added_to_kb: true,
      kb_entry_id: kbEntry?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  syncRetellInBackground(ctx.clientId)

  return NextResponse.json({ success: true, kb_entry_id: kbEntry?.id })
}
