import twilio from 'twilio'
import { env } from '@/lib/utils/env'
import { formatNewLeadSMS, formatUrgentLeadSMS, formatMissedCallSMS, formatDailySummarySMS } from './templates'
import type { NotificationPayload } from '@/types/api'
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
 * Selects and formats the SMS message body based on notification type.
 */
function formatMessageForType(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'urgent':
      return formatUrgentLeadSMS(payload)
    case 'new_lead':
      return formatNewLeadSMS(payload)
    case 'missed_call':
      return formatMissedCallSMS(payload)
    case 'daily_summary':
      // daily_summary payload doesn't have DailySummary shape — caller should use
      // formatDailySummarySMS directly and pass summary text in payload.summary
      return payload.summary ?? 'Daily summary not available.'
    default:
      return payload.summary ?? 'New notification from your AI receptionist.'
  }
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

// Re-export for use in daily summary cron handler
export { formatDailySummarySMS }
