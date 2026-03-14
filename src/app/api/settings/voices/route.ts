import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { retellClient } from '@/lib/retell/client'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const voices = await retellClient.voice.list()

  const formatted = voices.map(v => ({
    value: v.voice_id,
    label: `${v.voice_name}${v.accent ? ` — ${v.accent}` : ''}, ${v.gender}`,
    name: v.voice_name,
  }))

  formatted.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ voices: formatted })
}
