import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { buildAgentPrompt, updateRetellAgent } from '@/lib/retell/agent-builder'

export async function POST() {
  const ctx = await getUserContext()
  if (!ctx?.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prompt = await buildAgentPrompt(ctx.clientId)
    await updateRetellAgent(ctx.clientId)
    return NextResponse.json({ success: true, prompt })
  } catch (err) {
    console.error('[kb-sync] Error:', err)
    return NextResponse.json(
      { error: 'Sync failed', detail: String(err) },
      { status: 500 },
    )
  }
}
