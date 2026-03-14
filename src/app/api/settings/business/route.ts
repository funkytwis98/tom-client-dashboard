import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(200),
  owner_name: z.string().min(1).max(200),
  owner_phone: z.string().min(1).max(30),
})

export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { clientId, name, owner_name, owner_phone } = parsed.data

  // Verify the user has access to this client (via org ownership or client_owner role)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, client_id')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role ?? 'admin'

  if (role === 'client_owner') {
    if (profile?.client_id !== clientId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  } else {
    // Admin: verify client belongs to their org
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('org_id', org.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('clients')
    .update({
      name,
      owner_name,
      owner_phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
