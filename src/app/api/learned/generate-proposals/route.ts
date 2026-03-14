import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { generateProposalsForClient } from '@/lib/learned/generate-proposals'

/**
 * POST /api/learned/generate-proposals
 * Processes unprocessed brain_reflections into learning_proposals and unanswered_questions.
 */
export async function POST() {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateProposalsForClient(ctx.clientId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[generate-proposals] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
