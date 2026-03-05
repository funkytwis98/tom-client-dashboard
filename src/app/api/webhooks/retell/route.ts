import { env } from '@/lib/utils/env'
import { verifyRetellSignature } from '@/lib/retell/webhook-verify'
import { getClientByAgentId } from '@/lib/retell/client'
import { createServiceClient } from '@/lib/supabase/service'
import { isAfterHours } from '@/lib/utils/time'
import { analyzeCallTranscript } from '@/lib/analysis/lead-extraction'
import { sendOwnerSMS } from '@/lib/notifications/twilio'
import type { RetellWebhookEvent } from '@/types/retell'
import { reportError } from '@/lib/monitoring/report-error'
import type { NotificationPayload } from '@/types/api'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'

// ---------------------------------------------------------------------------
// POST /api/webhooks/retell
// Receives call lifecycle events from Retell AI and persists them to Supabase.
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  // Rate limit: 60 requests per minute per IP
  const rl = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl)

  // 1. Read raw body text (needed for signature verification before JSON parsing)
  const body = await req.text()

  // 2. Verify Retell HMAC-SHA256 signature
  const signature = req.headers.get('x-retell-signature')
  if (!await verifyRetellSignature(body, signature, env.retellApiKey())) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Parse event
  let event: RetellWebhookEvent
  try {
    event = JSON.parse(body) as RetellWebhookEvent
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const callId = event.call.call_id
  const eventType = event.event
  const supabase = createServiceClient()

  // 4. Idempotency check — skip if we already processed this (call_id, event_type) pair
  const { data: existing } = await supabase
    .from('webhook_processing_log')
    .select('id')
    .eq('call_id', callId)
    .eq('event_type', eventType)
    .single()

  if (existing) {
    return Response.json({ received: true, duplicate: true }, { status: 200 })
  }

  // 5. Route to event handler inside try/catch — 500 on failure so Retell retries
  try {
    switch (eventType) {
      case 'call_started':
        await handleCallStarted(event, supabase)
        break
      case 'call_ended':
        await handleCallEnded(event, supabase)
        break
      case 'call_analyzed':
        await handleCallAnalyzed(event, supabase)
        break
      default:
        // Unknown event — log and ignore
        console.warn('[retell-webhook] Unknown event type:', eventType)
    }
  } catch (err) {
    console.error('[retell-webhook] Handler error:', err)
    // Do NOT insert to processing log — let Retell retry
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  // 6. Record successful processing (idempotency guard for future retries)
  await supabase.from('webhook_processing_log').insert({
    call_id: callId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  })

  return Response.json({ received: true }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCallStarted(
  event: RetellWebhookEvent & { event: 'call_started' },
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  const { call } = event
  const client = await getClientByAgentId(call.agent_id)

  if (!client) {
    // Unknown agent — not our call, log and skip
    console.warn('[retell-webhook] Unknown agent_id:', call.agent_id)
    return
  }

  await supabase.from('calls').insert({
    client_id: client.id,
    retell_call_id: call.call_id,
    direction: call.direction,
    caller_number: call.from_number,
    status: 'in_progress',
    call_metadata: {},
  })
}

async function handleCallEnded(
  event: RetellWebhookEvent & { event: 'call_ended' },
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  const { call } = event
  const client = await getClientByAgentId(call.agent_id)

  if (!client) {
    console.warn('[retell-webhook] Unknown agent_id:', call.agent_id)
    return
  }

  // Determine call status
  const afterHours = isAfterHours(
    client.business_hours,
    call.end_timestamp,
    client.timezone
  )
  const isShortCall = call.duration_ms < 10000

  let status: 'completed' | 'voicemail' | 'missed'
  if (isShortCall) {
    status = 'missed'
  } else if (afterHours) {
    status = 'voicemail'
  } else {
    status = 'completed'
  }

  await supabase
    .from('calls')
    .update({
      status,
      duration_seconds: Math.round(call.duration_ms / 1000),
      transcript: call.transcript,
      recording_url: call.recording_url,
    })
    .eq('retell_call_id', call.call_id)

  // Fetch the call record ID for lead linkage
  const { data: callRecord } = await supabase
    .from('calls')
    .select('id')
    .eq('retell_call_id', call.call_id)
    .single()

  // Lead extraction — analyze transcript with Claude Haiku
  let leadId: string | null = null
  let callAnalysis: Awaited<ReturnType<typeof analyzeCallTranscript>> | null = null
  try {
    callAnalysis = await analyzeCallTranscript(call.transcript)

    // Update call record with AI-derived fields
    await supabase
      .from('calls')
      .update({
        sentiment: callAnalysis.sentiment,
        lead_score: callAnalysis.lead_score,
        summary: callAnalysis.summary,
        caller_name: callAnalysis.caller_name,
      })
      .eq('retell_call_id', call.call_id)

    // Create lead record if this call has lead potential
    if (callAnalysis.is_lead) {
      const { data: leadRecord } = await supabase
        .from('leads')
        .insert({
          client_id: client.id,
          call_id: callRecord?.id ?? null,
          name: callAnalysis.caller_name,
          phone: call.from_number,
          service_interested: callAnalysis.service_interested,
          notes: callAnalysis.notes,
          urgency: callAnalysis.urgency,
          status: 'new',
          owner_notified: false,
        })
        .select('id')
        .single()

      leadId = leadRecord?.id ?? null
    }
  } catch (err) {
    // Non-fatal — call is already logged, analysis is best-effort
    console.error("[retell-webhook] Lead extraction failed:", String(err))
    reportError({
      type: 'lead_extraction',
      message: String(err),
      clientId: client.id,
      callId: callRecord?.id ?? undefined,
      context: { retell_call_id: call.call_id },
    })
    // Merge error into existing metadata instead of replacing it
    const { data: existing } = await supabase
      .from('calls')
      .select('call_metadata')
      .eq('retell_call_id', call.call_id)
      .single()
    const merged = { ...(existing?.call_metadata as Record<string, unknown> ?? {}), lead_extraction_error: String(err) }
    await supabase.from('calls').update({ call_metadata: merged }).eq('retell_call_id', call.call_id)
  }

  // Notify business owner via SMS
  if (client.owner_phone) {
    try {
      const isUrgent = callAnalysis && callAnalysis.lead_score >= 9
      const isMissed = status !== 'completed'

      const payload: NotificationPayload = {
        client_id: client.id,
        call_id: callRecord?.id ?? undefined,
        lead_id: leadId ?? undefined,
        type: isUrgent ? 'urgent' : isMissed ? 'missed_call' : 'new_lead',
        recipient_phone: client.owner_phone,
        lead_score: callAnalysis?.lead_score ?? undefined,
        caller_name: callAnalysis?.caller_name ?? undefined,
        caller_number: call.from_number,
        summary: callAnalysis?.summary ?? undefined,
        service: callAnalysis?.service_interested ?? undefined,
      }

      await sendOwnerSMS(payload, supabase)

      // Mark lead as owner_notified
      if (leadId) {
        await supabase.from('leads').update({ owner_notified: true }).eq('id', leadId)
      }
    } catch (err) {
      // Non-fatal — call is already logged, notification is best-effort
      console.error('[retell-webhook] Owner notification failed:', err)
    }
  }
}

async function handleCallAnalyzed(
  event: RetellWebhookEvent & { event: 'call_analyzed' },
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  const { call } = event
  const analysis = call.call_analysis

  if (!analysis) return

  // Check what Claude's analysis already set — don't overwrite it
  const { data: existingCall } = await supabase
    .from('calls')
    .select('summary, sentiment')
    .eq('retell_call_id', call.call_id)
    .single()

  // Map Retell sentiment to our schema
  type Sentiment = 'positive' | 'neutral' | 'negative'
  const sentimentMap: Record<string, Sentiment> = {
    Positive: 'positive',
    Negative: 'negative',
    Neutral: 'neutral',
    Unknown: 'neutral',
  }
  const sentiment: Sentiment = sentimentMap[analysis.user_sentiment ?? 'Unknown'] ?? 'neutral'

  // Only fill in fields that Claude's analysis didn't already populate
  const updates: Record<string, unknown> = {}

  if (!existingCall?.summary) {
    updates.summary = analysis.call_summary ?? null
  }
  if (!existingCall?.sentiment) {
    updates.sentiment = sentiment
  }

  if (analysis.in_voicemail === true) {
    updates.status = 'voicemail'
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('calls').update(updates).eq('retell_call_id', call.call_id)
  }
}
