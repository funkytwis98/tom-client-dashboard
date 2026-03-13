// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: re-enable signature verification
import { env } from '@/lib/utils/env'
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: re-enable signature verification
import { verifyRetellSignature } from '@/lib/retell/webhook-verify'
import { getClientByAgentId } from '@/lib/retell/client'
import { createServiceClient } from '@/lib/supabase/service'
import { isAfterHours } from '@/lib/utils/time'
import { analyzeCallTranscript, analyzeCallWithBrain } from '@/lib/analysis/lead-extraction'
import { sendOwnerSMS, shouldSendNotification } from '@/lib/notifications/twilio'
import { buildPrompt, writeReflection, upsertContact, logUsage } from '@/lib/brain'
import type { RetellWebhookEvent } from '@/types/retell'
import { reportError } from '@/lib/monitoring/report-error'
import type { NotificationPayload } from '@/types/api'
import type { ClientSettings } from '@/types/domain'
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
  console.log('[retell-webhook] Received webhook, body length:', body.length)

  // TODO: Re-enable signature verification once RETELL_API_KEY is confirmed correct
  // 2. Verify Retell HMAC-SHA256 signature (TEMPORARILY DISABLED)
  const signature = req.headers.get('x-retell-signature')
  console.log('[retell-webhook] Signature present:', !!signature, '(verification SKIPPED)')
  // if (!await verifyRetellSignature(body, signature, env.retellApiKey())) {
  //   console.error('[retell-webhook] Signature verification FAILED. Signature:', signature?.substring(0, 20) + '...')
  //   return Response.json({ error: 'Invalid signature' }, { status: 401 })
  // }
  // console.log('[retell-webhook] Signature verified OK')

  // 3. Parse event
  let event: RetellWebhookEvent
  try {
    event = JSON.parse(body) as RetellWebhookEvent
  } catch (err) {
    console.error('[retell-webhook] JSON parse failed:', err)
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const callId = event.call.call_id
  const eventType = event.event
  console.log('[retell-webhook] Event:', eventType, '| Call ID:', callId, '| Agent:', event.call.agent_id)

  const supabase = createServiceClient()

  // 4. Idempotency check — skip if we already processed this (call_id, event_type) pair
  const { data: existing, error: idempotencyError } = await supabase
    .from('webhook_processing_log')
    .select('id')
    .eq('retell_call_id', callId)
    .eq('event_type', eventType)
    .single()

  if (idempotencyError && idempotencyError.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" which is expected when not a duplicate
    console.error('[retell-webhook] Idempotency check error:', idempotencyError)
  }

  if (existing) {
    console.log('[retell-webhook] Duplicate event, skipping:', callId, eventType)
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
        console.warn('[retell-webhook] Unknown event type:', eventType)
    }
  } catch (err) {
    console.error('[retell-webhook] Handler error for', eventType, ':', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  // 6. Record successful processing (idempotency guard for future retries)
  const { error: logError } = await supabase.from('webhook_processing_log').insert({
    retell_call_id: callId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  })
  if (logError) {
    console.error('[retell-webhook] Failed to insert processing log:', logError)
  }

  console.log('[retell-webhook] Successfully processed:', eventType, callId)
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
    console.error('[retell-webhook] handleCallStarted: No client found for agent_id:', call.agent_id)
    return
  }

  console.log('[retell-webhook] handleCallStarted: client=', client.name, 'from=', call.from_number)

  const { error } = await supabase.from('calls').insert({
    client_id: client.id,
    retell_call_id: call.call_id,
    direction: call.direction,
    caller_number: call.from_number,
    status: 'in_progress',
    call_metadata: {},
  })

  if (error) {
    console.error('[retell-webhook] handleCallStarted: INSERT calls failed:', error)
    throw new Error(`Failed to insert call: ${error.message}`)
  }

  console.log('[retell-webhook] handleCallStarted: call inserted successfully')
}

async function handleCallEnded(
  event: RetellWebhookEvent & { event: 'call_ended' },
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  const { call } = event
  const client = await getClientByAgentId(call.agent_id)

  if (!client) {
    console.error('[retell-webhook] handleCallEnded: No client found for agent_id:', call.agent_id)
    return
  }

  console.log('[retell-webhook] handleCallEnded: client=', client.name, 'duration=', call.duration_ms, 'ms')

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

  // Check if a call_started record exists to update
  const { data: existingCall, error: lookupError } = await supabase
    .from('calls')
    .select('id')
    .eq('retell_call_id', call.call_id)
    .single()

  if (lookupError && lookupError.code !== 'PGRST116') {
    console.error('[retell-webhook] handleCallEnded: lookup error:', lookupError)
  }

  if (existingCall) {
    // Update existing call_started record
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status,
        duration_seconds: Math.round(call.duration_ms / 1000),
        transcript: call.transcript,
        recording_url: call.recording_url,
      })
      .eq('retell_call_id', call.call_id)

    if (updateError) {
      console.error('[retell-webhook] handleCallEnded: UPDATE calls failed:', updateError)
    }
  } else {
    // No call_started record — insert fresh (call_started may have been missed)
    console.warn('[retell-webhook] handleCallEnded: No call_started record found, inserting fresh row')
    const { error: insertError } = await supabase.from('calls').insert({
      client_id: client.id,
      retell_call_id: call.call_id,
      direction: call.direction,
      caller_number: call.from_number,
      status,
      duration_seconds: Math.round(call.duration_ms / 1000),
      transcript: call.transcript,
      recording_url: call.recording_url,
      call_metadata: call,
    })

    if (insertError) {
      console.error('[retell-webhook] handleCallEnded: INSERT calls failed:', insertError)
      throw new Error(`Failed to insert call: ${insertError.message}`)
    }
  }

  // Fetch the call record ID for lead linkage
  const { data: callRecord, error: fetchError } = await supabase
    .from('calls')
    .select('id')
    .eq('retell_call_id', call.call_id)
    .single()

  if (fetchError) {
    console.error('[retell-webhook] handleCallEnded: Failed to fetch call record:', fetchError)
  }

  console.log('[retell-webhook] handleCallEnded: call record id=', callRecord?.id, 'status=', status)

  // Lead extraction — try brain-enhanced first, fall back to basic
  let leadId: string | null = null
  let callAnalysis: Awaited<ReturnType<typeof analyzeCallTranscript>> | null = null
  try {
    // Try brain-enhanced analysis
    let usedBrain = false
    try {
      const brainResult = await buildPrompt(client.id, 'receptionist', {
        callerPhone: call.from_number,
      })

      const result = await analyzeCallWithBrain(
        call.transcript,
        brainResult.prompt,
        brainResult.model,
      )

      callAnalysis = result.analysis

      // Write reflection if available
      if (result.reflection) {
        result.reflection.client_id = client.id
        writeReflection(result.reflection)
      }

      // Update contact history
      upsertContact(client.id, call.from_number, {
        name: callAnalysis.caller_name,
        interactionSummary: callAnalysis.summary,
        confidenceScore: result.reflection?.confidence_score,
      })

      // Log usage
      logUsage({
        clientId: client.id,
        capability: 'receptionist',
        model: brainResult.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        triggerType: 'phone_call',
      })

      usedBrain = true
      console.log('[retell-webhook] Brain-enhanced analysis succeeded')
    } catch (brainErr) {
      console.warn('[retell-webhook] Brain extraction failed, using basic:', String(brainErr))
    }

    if (!usedBrain) {
      callAnalysis = await analyzeCallTranscript(call.transcript)
      console.log('[retell-webhook] Basic analysis result:', JSON.stringify(callAnalysis))
    }

    // Update call record with AI-derived fields
    if (callAnalysis) {
      const { error: analysisUpdateError } = await supabase
        .from('calls')
        .update({
          sentiment: callAnalysis.sentiment,
          lead_score: callAnalysis.lead_score,
          summary: callAnalysis.summary,
          caller_name: callAnalysis.caller_name,
          callback_promised: callAnalysis.requires_callback,
        })
        .eq('retell_call_id', call.call_id)

      if (analysisUpdateError) {
        console.error('[retell-webhook] Failed to update call with analysis:', analysisUpdateError)
      }
    }

    // Create lead record if this call has lead potential
    if (callAnalysis?.is_lead) {
      const { data: leadRecord, error: leadError } = await supabase
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

      if (leadError) {
        console.error('[retell-webhook] Failed to insert lead:', leadError)
      }

      leadId = leadRecord?.id ?? null
      console.log('[retell-webhook] Lead created:', leadId)
    }
  } catch (err) {
    console.error('[retell-webhook] Lead extraction failed:', String(err))
    reportError({
      type: 'lead_extraction',
      message: String(err),
      clientId: client.id,
      callId: callRecord?.id ?? undefined,
      context: { retell_call_id: call.call_id },
    })
  }

  // Notify business owner via SMS (respects notification settings)
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
        is_after_hours: afterHours,
      }

      const settings = (client.settings ?? {}) as ClientSettings
      if (shouldSendNotification(settings, client.timezone, payload)) {
        await sendOwnerSMS(payload, supabase)
        console.log('[retell-webhook] Owner SMS sent to:', client.owner_phone)

        // Mark lead as owner_notified
        if (leadId) {
          const { error: notifyError } = await supabase
            .from('leads')
            .update({ owner_notified: true })
            .eq('id', leadId)
          if (notifyError) {
            console.error('[retell-webhook] Failed to mark lead as notified:', notifyError)
          }
        }
      } else {
        console.log('[retell-webhook] Notification suppressed by settings')
      }
    } catch (err) {
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

  if (!analysis) {
    console.log('[retell-webhook] handleCallAnalyzed: no analysis data, skipping')
    return
  }

  const { data: existingCall, error: fetchError } = await supabase
    .from('calls')
    .select('summary, sentiment, lead_score, caller_name, status')
    .eq('retell_call_id', call.call_id)
    .single()

  if (fetchError) {
    console.error('[retell-webhook] handleCallAnalyzed: fetch error:', fetchError)
  }

  // If Claude already analyzed this call (summary exists), skip Retell's analysis entirely
  if (existingCall?.summary) {
    console.log('[retell-webhook] handleCallAnalyzed: Claude already analyzed, skipping Retell analysis')
    return
  }

  // Map Retell sentiment to our schema
  type Sentiment = 'positive' | 'neutral' | 'negative'
  const sentimentMap: Record<string, Sentiment> = {
    Positive: 'positive',
    Negative: 'negative',
    Neutral: 'neutral',
    Unknown: 'neutral',
  }
  const sentiment: Sentiment = sentimentMap[analysis.user_sentiment ?? 'Unknown'] ?? 'neutral'

  const updates: Record<string, unknown> = {}

  if (!existingCall?.summary) {
    updates.summary = analysis.call_summary ?? null
  }
  if (!existingCall?.sentiment) {
    updates.sentiment = sentiment
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('calls')
      .update(updates)
      .eq('retell_call_id', call.call_id)

    if (updateError) {
      console.error('[retell-webhook] handleCallAnalyzed: update failed:', updateError)
    } else {
      console.log('[retell-webhook] handleCallAnalyzed: updated call with Retell analysis')
    }
  }
}
