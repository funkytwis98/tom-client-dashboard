import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * GET /api/knowledge-base/context?client_id=xxx
 * Returns a combined text block for the AI prompt.
 * Uses service client since this is called from Retell webhook context.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')

  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const [servicesRes, hoursRes, kbRes] = await Promise.all([
    supabase
      .from('services_pricing')
      .select('service_name, price_text, notes')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('business_hours')
      .select('day_of_week, is_open, open_time, close_time')
      .eq('client_id', clientId)
      .order('day_of_week', { ascending: true }),
    supabase
      .from('knowledge_base')
      .select('category, title, content, expires_at')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .in('category', ['faq', 'policies', 'promotions'])
      .order('priority', { ascending: false }),
  ])

  const sections: string[] = []

  // Services & Pricing
  if (servicesRes.data?.length) {
    const lines = servicesRes.data.map((s) => {
      const note = s.notes ? ` (${s.notes})` : ''
      return `- ${s.service_name}: ${s.price_text}${note}`
    })
    sections.push(`## Services and Pricing\n${lines.join('\n')}`)
  }

  // Business Hours
  if (hoursRes.data?.length) {
    const lines = hoursRes.data.map((h) => {
      const day = DAY_NAMES[h.day_of_week] ?? `Day ${h.day_of_week}`
      return h.is_open ? `${day}: ${h.open_time} - ${h.close_time}` : `${day}: Closed`
    })
    sections.push(`## Business Hours\n${lines.join('\n')}`)
  }

  // KB entries (FAQ, Policies, Promotions)
  if (kbRes.data?.length) {
    const now = new Date()
    const active = kbRes.data.filter(
      (e) => !e.expires_at || new Date(e.expires_at) > now
    )

    const grouped: Record<string, typeof active> = {}
    for (const entry of active) {
      if (!grouped[entry.category]) grouped[entry.category] = []
      grouped[entry.category].push(entry)
    }

    for (const [cat, entries] of Object.entries(grouped)) {
      const header = `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}`
      const body = entries.map((e) => `### ${e.title}\n${e.content}`).join('\n\n')
      sections.push(`${header}\n${body}`)
    }
  }

  return NextResponse.json({ context: sections.join('\n\n') })
}
