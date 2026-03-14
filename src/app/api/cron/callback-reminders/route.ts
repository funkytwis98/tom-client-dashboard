import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendOwnerSMS } from '@/lib/notifications/twilio'
import { env } from '@/lib/utils/env'
import type { NotificationPayload } from '@/types/api'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'

/**
 * POST /api/cron/callback-reminders
 *
 * Sends reminder SMS to owners for calls where Tom promised a callback
 * but callback_completed is still false, and at least 2 hours have passed.
 * Only sends one reminder per call (callback_reminder_sent guard).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rl = rateLimit(req, { limit: 5, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl) as unknown as NextResponse

  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${env.revalidateSecret()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Find calls needing a callback reminder
  const { data: calls, error } = await supabase
    .from('calls')
    .select('id, client_id, caller_name, caller_number, summary, created_at')
    .eq('callback_promised', true)
    .eq('callback_completed', false)
    .eq('callback_reminder_sent', false)
    .lt('created_at', twoHoursAgo)
    .limit(50)

  if (error || !calls) {
    console.error('[callback-reminders] Query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let sent = 0
  const errors: string[] = []

  for (const call of calls) {
    try {
      // Get client info for owner phone
      const { data: client } = await supabase
        .from('clients')
        .select('id, owner_phone, settings')
        .eq('id', call.client_id)
        .single()

      if (!client?.owner_phone) continue

      // Check if notifications are paused
      const settings = (client.settings ?? {}) as Record<string, unknown>
      if (settings.notifications_paused === true) continue

      // Get service info from associated lead
      const { data: leadData } = await supabase
        .from('leads')
        .select('service_interested')
        .eq('call_id', call.id)
        .maybeSingle()

      // Build the reminder message
      const name = call.caller_name ?? call.caller_number ?? 'A caller'
      const service = leadData?.service_interested
      const serviceText = service ? ` about ${service}` : ''
      const timeAgo = getTimeAgo(call.created_at)
      const phone = call.caller_number ? `\nCall back: ${call.caller_number}` : ''

      const message = `⏰ Reminder: ${name} is waiting for a callback${serviceText}. Called ${timeAgo} ago.${phone}`

      // Fetch lead_score from the call for the payload
      const { data: callWithScore } = await supabase
        .from('calls')
        .select('lead_score')
        .eq('id', call.id)
        .single()

      const payload: NotificationPayload = {
        client_id: call.client_id,
        call_id: call.id,
        type: 'new_lead',
        recipient_phone: client.owner_phone,
        summary: message,
        caller_name: call.caller_name ?? undefined,
        caller_number: call.caller_number ?? undefined,
        lead_score: callWithScore?.lead_score ?? undefined,
      }

      // Send the raw message directly (bypass formatMessageForType)
      await sendOwnerSMS(
        { ...payload, type: 'daily_summary', summary: message },
        supabase,
      )

      // Mark reminder as sent (single-send guard)
      await supabase
        .from('calls')
        .update({ callback_reminder_sent: true })
        .eq('id', call.id)

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[callback-reminders] Error for call ${call.id}:`, msg)
      errors.push(`${call.id}: ${msg}`)
    }
  }

  return NextResponse.json({ sent, errors, total_pending: calls.length })
}

function getTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'less than an hour'
  if (hours === 1) return '1 hour'
  return `${hours} hours`
}
