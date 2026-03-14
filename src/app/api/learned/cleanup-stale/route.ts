import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { cleanupStaleProposals } from '@/lib/learned/kb-cross-reference'

/**
 * POST /api/learned/cleanup-stale
 * Checks all pending proposals/questions against current KB and auto-dismisses matches.
 */
export async function POST() {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await cleanupStaleProposals(ctx.clientId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cleanup-stale] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
