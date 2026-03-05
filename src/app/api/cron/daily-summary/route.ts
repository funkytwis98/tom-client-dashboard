import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendOwnerSMS } from '@/lib/notifications/twilio'
import { formatDailySummarySMS } from '@/lib/notifications/templates'
import { env } from '@/lib/utils/env'
import type { DailySummary } from '@/types/api'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'

/**
 * POST /api/cron/daily-summary
 *
 * Sends a daily summary SMS to each active client's owner.
 * Secured with Authorization: Bearer {REVALIDATE_SECRET} header.
 *
 * Body (optional): { client_id: string } — if present, runs for that client only.
 *
 * Returns: { sent: number, errors: string[] }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 5 requests per minute per IP
  const rl = rateLimit(req, { limit: 5, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl) as unknown as NextResponse

  // Validate cron secret to prevent unauthorized execution
  const authHeader = req.headers.get('authorization') ?? ''
  const expectedSecret = `Bearer ${env.revalidateSecret()}`

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Parse optional client_id from body
  let targetClientId: string | null = null
  try {
    const rawBody = await req.text()
    if (rawBody) {
      const parsed = JSON.parse(rawBody)
      targetClientId = parsed.client_id ?? null
    }
  } catch {
    // Body is optional — ignore parse errors
  }

  // Fetch active clients (or single client if specified)
  let clientsQuery = supabase
    .from('clients')
    .select('id, name, owner_phone, timezone, settings')
    .eq('subscription_status', 'active')

  if (targetClientId) {
    clientsQuery = clientsQuery.eq('id', targetClientId)
  }

  const { data: clients, error: clientsError } = await clientsQuery

  if (clientsError || !clients) {
    console.error('[daily-summary] Failed to fetch clients:', clientsError)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }

  let sent = 0
  const errors: string[] = []

  for (const client of clients) {
    try {
      // Skip clients with no owner phone
      if (!client.owner_phone) {
        continue
      }

      // Skip if notifications are paused
      const settings = (client.settings ?? {}) as Record<string, unknown>
      if (settings.notifications_paused === true) {
        continue
      }

      const summary = await buildDailySummary(client.id, client.timezone ?? 'America/New_York', supabase)

      const message = formatDailySummarySMS(summary)

      await sendOwnerSMS(
        {
          client_id: client.id,
          type: 'daily_summary',
          recipient_phone: client.owner_phone,
          summary: message,
        },
        supabase,
      )

      sent++
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[daily-summary] Error for client ${client.id}:`, errMsg)
      errors.push(`${client.id}: ${errMsg}`)
    }
  }

  return NextResponse.json({ sent, errors, total_clients: clients.length })
}

/**
 * Builds a DailySummary object by querying calls and leads for today
 * in the client's timezone.
 */
async function buildDailySummary(
  clientId: string,
  timezone: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<DailySummary> {
  // Compute today's midnight in the client's timezone using Intl
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // "YYYY-MM-DD"
  const todayStart = new Date(`${todayStr}T00:00:00`)

  // Convert to UTC ISO string for Supabase filtering
  const todayStartUtc = todayStart.toISOString()
  const tomorrowStartUtc = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString()

  // Fetch today's calls
  const { data: calls } = await supabase
    .from('calls')
    .select('id, duration_seconds')
    .eq('client_id', clientId)
    .gte('created_at', todayStartUtc)
    .lt('created_at', tomorrowStartUtc)

  const totalCalls = calls?.length ?? 0
  const avgDurationSeconds =
    totalCalls > 0
      ? Math.round(
          (calls ?? []).reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / totalCalls,
        )
      : 0

  // Fetch today's leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, service_interested, lead_score:calls(lead_score), status')
    .eq('client_id', clientId)
    .gte('created_at', todayStartUtc)
    .lt('created_at', tomorrowStartUtc)

  const newLeads = leads?.length ?? 0
  const booked = leads?.filter((l) => l.status === 'booked').length ?? 0

  // Find top lead by lead_score
  const { data: topLeadData } = await supabase
    .from('leads')
    .select('name, service_interested, calls(lead_score)')
    .eq('client_id', clientId)
    .gte('created_at', todayStartUtc)
    .lt('created_at', tomorrowStartUtc)
    .order('created_at', { ascending: false })
    .limit(10)

  // Find the lead with the highest score
  let topLead: DailySummary['top_lead'] = null

  if (topLeadData && topLeadData.length > 0) {
    // Get the best scored lead directly from calls joined data
    const { data: bestLead } = await supabase
      .from('leads')
      .select('name, service_interested, call_id')
      .eq('client_id', clientId)
      .gte('created_at', todayStartUtc)
      .lt('created_at', tomorrowStartUtc)
      .not('call_id', 'is', null)
      .limit(1)
      .single()

    if (bestLead && bestLead.call_id) {
      const { data: callData } = await supabase
        .from('calls')
        .select('lead_score')
        .eq('id', bestLead.call_id)
        .single()

      topLead = {
        name: bestLead.name,
        service: bestLead.service_interested,
        score: callData?.lead_score ?? 0,
      }
    }
  }

  const today = now.toISOString().slice(0, 10)

  return {
    date: today,
    total_calls: totalCalls,
    new_leads: newLeads,
    booked,
    avg_duration_seconds: avgDurationSeconds,
    top_lead: topLead,
  }
}
