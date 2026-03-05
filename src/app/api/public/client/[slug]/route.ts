import { createServiceClient } from '@/lib/supabase/service'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'
import type { KnowledgeEntry } from '@/types/domain'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const rl = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl)

  const { slug } = await params
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return Response.json(
      { error: 'Invalid slug' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const supabase = createServiceClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, slug, phone_number, business_hours, address, timezone')
    .eq('slug', slug)
    .eq('subscription_status', 'active')
    .single()

  if (clientError || !client) {
    return Response.json(
      { error: 'Client not found' },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const { data: knowledge } = await supabase
    .from('knowledge_base')
    .select('category, title, content')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  // Group knowledge entries by category
  const grouped: Record<string, { title: string; content: string }[]> = {}
  for (const entry of (knowledge ?? []) as Pick<KnowledgeEntry, 'category' | 'title' | 'content'>[]) {
    if (!grouped[entry.category]) grouped[entry.category] = []
    grouped[entry.category].push({ title: entry.title, content: entry.content })
  }

  return Response.json(
    {
      name: client.name,
      slug: client.slug,
      phone_number: client.phone_number,
      business_hours: client.business_hours,
      address: client.address,
      timezone: client.timezone,
      knowledge_base: grouped,
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
