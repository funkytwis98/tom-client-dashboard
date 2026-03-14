import twilio from 'twilio'
import { env } from '@/lib/utils/env'
import { formatHotLeadSMS, formatMediumLeadSMS, formatBasicCallSMS, formatAfterHoursSMS, formatDailySummarySMS } from './templates'
import type { NotificationPayload } from '@/types/api'
import type { ClientSettings } from '@/types/domain'
import { reportError } from '@/lib/monitoring/report-error'
import type { createServiceClient } from '@/lib/supabase/service'

// Singleton Twilio client — created once, reused across requests in the same process
let _twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient(): ReturnType<typeof twilio> {
  if (!_twilioClient) {
    _twilioClient = twilio(env.twilioAccountSid(), env.twilioAuthToken())
  }
  return _twilioClient
}

/**
 * Validates that an inbound request is genuinely from Twilio by checking the
 * X-Twilio-Signature header against the HMAC-SHA1 of the URL + POST params.
 */
export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  return twilio.validateRequest(env.twilioAuthToken(), signature, url, params)
}

/**
 * Selects and formats the SMS message body based on context.
 *
 * Priority: after-hours > score-based tiers > basic fallback.
 * Score tiers: hot (>=7), medium (4-6), basic (<4 or no data).
 */
function formatMessageForType(payload: NotificationPayload): string {
  if (payload.type === 'daily_summary') {
    return payload.summary ?? 'Daily summary not available.'
  }

  // After-hours calls get their own format regardless of score
  if (payload.is_after_hours) {
    return formatAfterHoursSMS(payload)
  }

  // Score-based formatting
  const score = payload.lead_score
  if (score != null && score >= 7) return formatHotLeadSMS(payload)
  if (score != null && score >= 4) return formatMediumLeadSMS(payload)

  return formatBasicCallSMS(payload)
}

/**
 * Sends an SMS to the business owner via Twilio and logs the notification attempt
 * to the notifications table. Always logs — even on Twilio send failure.
 */
export async function sendOwnerSMS(
  payload: NotificationPayload,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const client = getTwilioClient()
  const message = formatMessageForType(payload)

  let status: 'sent' | 'failed' = 'sent'
  try {
    await client.messages.create({
      body: message,
      from: env.twilioPhoneNumber(),
      to: payload.recipient_phone,
    })
  } catch (err) {
    status = 'failed'
    console.error('[sendOwnerSMS] Twilio send failed:', err)
    reportError({
      type: 'owner_sms',
      message: String(err),
      clientId: payload.client_id,
      callId: payload.call_id,
      context: { recipient: payload.recipient_phone, notification_type: payload.type },
    })
  }

  // Always log the notification attempt regardless of Twilio success/failure
  try {
    await supabase.from('notifications').insert({
      client_id: payload.client_id,
      call_id: payload.call_id ?? null,
      lead_id: payload.lead_id ?? null,
      type: payload.type,
      channel: 'sms',
      recipient_phone: payload.recipient_phone,
      message,
      status,
    })
  } catch (err) {
    console.error('[sendOwnerSMS] Failed to log notification to DB:', err)
  }
}

/**
 * Checks notification settings to decide whether an SMS should be sent.
 * Respects notifications_paused, notification_threshold, and quiet hours.
 * Urgent notifications always bypass threshold and quiet hours.
 */
export function shouldSendNotification(
  settings: ClientSettings,
  timezone: string,
  payload: NotificationPayload,
): boolean {
  // Paused → suppress everything
  if (settings.notifications_paused) return false

  // Urgent always sends (bypasses threshold + quiet hours)
  if (payload.type === 'urgent') return true

  // Check lead score against threshold (default 5)
  const threshold = settings.notification_threshold ?? 5
  if (payload.lead_score !== undefined && payload.lead_score < threshold) {
    return false
  }

  // Check quiet hours
  if (settings.quiet_hours_start && settings.quiet_hours_end) {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
    const current = h * 60 + m

    const [startH, startM] = settings.quiet_hours_start.split(':').map(Number)
    const [endH, endM] = settings.quiet_hours_end.split(':').map(Number)
    const start = startH * 60 + startM
    const end = endH * 60 + endM

    // Quiet hours can span midnight (e.g. 22:00 → 07:00)
    const inQuiet =
      start <= end
        ? current >= start && current < end
        : current >= start || current < end

    if (inQuiet) return false
  }

  return true
}

// Re-export for use in daily summary cron handler
export { formatDailySummarySMS }
