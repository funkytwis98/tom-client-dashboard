import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()

  // Fetch proposal to get title for hash
  const { data: proposal } = await supabase
    .from('learning_proposals')
    .select('title')
    .eq('id', id)
    .eq('client_id', ctx.clientId)
    .single()

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  const hash = simpleHash(proposal.title)

  await supabase
    .from('learning_proposals')
    .update({
      status: 'dismissed',
      reviewed_at: new Date().toISOString(),
      dismissed_hash: hash,
    })
    .eq('id', id)

  return NextResponse.json({ success: true })
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
