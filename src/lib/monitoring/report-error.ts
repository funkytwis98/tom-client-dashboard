import { createServiceClient } from '@/lib/supabase/service'
import { env, isProduction } from '@/lib/utils/env'
import twilio from 'twilio'

interface ReportErrorOptions {
  type: 'lead_extraction' | 'owner_sms' | 'retell_sync' | 'twilio_webhook'
  message: string
  detail?: string
  clientId?: string
  callId?: string
  context?: Record<string, unknown>
}

// In-memory dedup: type -> last alert timestamp
const recentAlerts = new Map<string, number>()
const DEDUP_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Central error reporter. Logs to system_errors table and optionally
 * sends an SMS alert to ADMIN_ALERT_PHONE. Never throws, never blocks
 * the caller — all work is fire-and-forget.
 */
export function reportError(opts: ReportErrorOptions): void {
  // Fire-and-forget — caller should not await this
  void reportErrorAsync(opts)
}

async function reportErrorAsync(opts: ReportErrorOptions): Promise<void> {
  try {
    const supabase = createServiceClient()

    // 1. Always persist to DB
    await supabase.from('system_errors').insert({
      error_type: opts.type,
      message: opts.message,
      detail: opts.detail ?? null,
      client_id: opts.clientId ?? null,
      call_id: opts.callId ?? null,
      context: opts.context ?? {},
    })

    // 2. SMS alert (production only, with dedup)
    const adminPhone = env.adminAlertPhone()
    if (!adminPhone || !isProduction()) return

    const now = Date.now()
    const lastAlert = recentAlerts.get(opts.type) ?? 0
    if (now - lastAlert < DEDUP_MS) return

    recentAlerts.set(opts.type, now)

    const client = twilio(env.twilioAccountSid(), env.twilioAuthToken())
    await client.messages.create({
      body: `[AI Receptionist Alert] ${opts.type}: ${opts.message}`,
      from: env.twilioPhoneNumber(),
      to: adminPhone,
    })
  } catch (err) {
    // Last resort — never let monitoring blow up the app
    console.error('[reportError] Failed to report error:', err)
  }
}
