import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_name, owner_name, owner_phone, owner_email } = body

    // Validate required fields
    if (!business_name || typeof business_name !== 'string' || !business_name.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }
    if (!owner_name || typeof owner_name !== 'string' || !owner_name.trim()) {
      return NextResponse.json({ error: 'Owner name is required' }, { status: 400 })
    }
    if (!owner_phone || typeof owner_phone !== 'string' || !owner_phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('signup_requests').insert({
      business_name: business_name.trim(),
      owner_name: owner_name.trim(),
      owner_phone: owner_phone.trim(),
      owner_email: owner_email?.trim() || null,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Signup request error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
