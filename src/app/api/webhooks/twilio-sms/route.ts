import { NextRequest, NextResponse } from 'next/server'
import { parseOwnerCommand } from '@/lib/notifications/parser'
import { verifyTwilioSignature } from '@/lib/notifications/twilio'
import { createServiceClient } from '@/lib/supabase/service'
import { reportError } from '@/lib/monitoring/report-error'
import { env } from '@/lib/utils/env'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'
import { classifyIntent, buildPrompt, writeReflection, logUsage } from '@/lib/brain'
import { GatedCapabilityError } from '@/lib/brain/types'
import type { SubscriptionTier } from '@/lib/brain/types'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropicApiKey() })
  return _anthropic
}

/**
 * POST /api/webhooks/twilio-sms
 *
 * Handles inbound SMS from Twilio when a business owner texts back.
 * Now integrated with the brain library for intent classification and smart responses.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 30 requests per minute per IP
  const rl = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl) as unknown as NextResponse

  // Parse URL-encoded form body (Twilio sends application/x-www-form-urlencoded)
  let formData: URLSearchParams
  try {
    const rawBody = await req.text()
    formData = new URLSearchParams(rawBody)
  } catch {
    return NextResponse.json({ error: 'Failed to parse request body' }, { status: 400 })
  }

  const from = formData.get('From') ?? ''
  const body = formData.get('Body') ?? ''

  // Validate Twilio signature to prevent spoofed requests
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const webhookUrl = env.twilioWebhookUrl()

  const params: Record<string, string> = {}
  formData.forEach((value, key) => {
    params[key] = value
  })

  if (!verifyTwilioSignature(signature, webhookUrl, params)) {
    console.warn('[twilio-sms] Invalid Twilio signature from:', from)
    return new NextResponse('Forbidden', { status: 403 })
  }

  const supabase = createServiceClient()

  try {
    // Find the client whose owner matches the sender phone number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, owner_phone, owner_name, subscription_tier, settings')
      .eq('owner_phone', from)
      .single()

    if (clientError || !client) {
      console.warn('[twilio-sms] No client found for owner_phone:', from)
      return twimlResponse('Unknown sender.')
    }

    // Get most recent notification for this client (to know which lead to update)
    const { data: recentNotification } = await supabase
      .from('notifications')
      .select('id, lead_id')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Parse owner command (legacy pattern matching for lead status updates)
    const command = parseOwnerCommand(body)

    // Handle direct lead status commands (contacted, booked, lost, pause, resume)
    if (command.action !== 'unknown' && command.action !== 'website') {
      // Update lead status
      if (recentNotification?.lead_id && command.action !== 'pause' && command.action !== 'resume') {
        const statusMap: Record<string, string> = {
          contacted: 'contacted',
          booked: 'booked',
          lost: 'lost',
        }
        const newStatus = statusMap[command.action]
        if (newStatus) {
          await supabase
            .from('leads')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', recentNotification.lead_id)
        }
      }

      // Handle pause/resume
      if (command.action === 'pause' || command.action === 'resume') {
        await supabase
          .from('clients')
          .update({
            settings: { notifications_paused: command.action === 'pause' },
            updated_at: new Date().toISOString(),
          })
          .eq('id', client.id)
      }

      // Log owner_response
      if (recentNotification) {
        await supabase
          .from('notifications')
          .update({ owner_response: body })
          .eq('id', recentNotification.id)
      }

      const confirmationMessages: Record<string, string> = {
        contacted: 'Got it! Lead marked as contacted.',
        booked: 'Got it! Lead marked as booked.',
        lost: 'Got it! Lead marked as lost.',
        pause: 'Notifications paused. Text "resume" to turn them back on.',
        resume: 'Notifications resumed.',
      }

      return twimlResponse(confirmationMessages[command.action] ?? 'Got it!')
    }

    // For non-command messages, use the brain library's intent classifier
    const tier = (client.subscription_tier ?? 'free') as SubscriptionTier
    const intent = classifyIntent(body, tier, client.name)

    // If capability is gated, return upsell message
    if (intent.gated && intent.upsellMessage) {
      return twimlResponse(intent.upsellMessage)
    }

    // Build brain prompt and get smart response
    try {
      const brainResult = await buildPrompt(client.id, intent.capability, {
        callerPhone: from,
        smsThread: [body],
        additionalInstructions: `The business owner just texted you: "${body}"\n\nRespond naturally as their helpful AI coworker Tom. Keep it short and conversational — this is a text message.`,
      })

      const message = await getAnthropicClient().messages.create({
        model: brainResult.model,
        max_tokens: 300,
        system: brainResult.prompt,
        messages: [{ role: 'user', content: body }],
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      // Log usage
      logUsage({
        clientId: client.id,
        capability: intent.capability,
        model: brainResult.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        triggerType: 'sms_response',
      })

      // Write reflection (basic — SMS doesn't need full reflection)
      writeReflection({
        client_id: client.id,
        capability: intent.capability,
        confidence_score: 4, // SMS responses are generally straightforward
        knowledge_gaps: [],
        knowledge_used: [],
        caller_sentiment: 'neutral',
        suggested_knowledge: [],
        pattern_noticed: null,
        interaction_summary: `Owner texted: "${body.slice(0, 100)}"`,
        trigger_type: 'sms_response',
      })

      // Log owner_response on notification
      if (recentNotification) {
        await supabase
          .from('notifications')
          .update({ owner_response: body })
          .eq('id', recentNotification.id)
      }

      return twimlResponse(responseText || 'Got it!')
    } catch (brainErr) {
      if (brainErr instanceof GatedCapabilityError) {
        return twimlResponse(brainErr.upsellMessage)
      }

      // Brain failed — fall back to legacy website analytics handler or simple response
      console.warn('[twilio-sms] Brain response failed, using fallback:', String(brainErr))

      // Legacy website analytics handler as fallback
      if (command.action === 'website' || /\b(website|visitors|traffic)\b/i.test(body)) {
        return await handleWebsiteAnalytics(supabase, client.id)
      }

      return twimlResponse('Got it!')
    }
  } catch (err) {
    console.error('[twilio-sms] Handler error:', err)
    reportError({
      type: 'twilio_webhook',
      message: String(err),
      context: { from, body },
    })
    return twimlResponse('Sorry, something went wrong. Please try again.')
  }
}

/**
 * Legacy website analytics handler — kept as fallback.
 */
async function handleWebsiteAnalytics(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string,
): Promise<NextResponse> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [thisWeekRes, lastWeekRes] = await Promise.all([
    supabase
      .from('website_analytics')
      .select('event_type, event_label')
      .eq('client_id', clientId)
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('website_analytics')
      .select('event_type')
      .eq('client_id', clientId)
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', weekAgo.toISOString()),
  ])

  const thisWeek = thisWeekRes.data || []
  const lastWeek = lastWeekRes.data || []

  let visitors = 0
  let clicks = 0
  let forms = 0
  for (const e of thisWeek) {
    if (e.event_type === 'page_view') visitors++
    else if (e.event_type === 'button_click') clicks++
    else if (e.event_type === 'form_submit') forms++
  }

  let lastWeekVisitors = 0
  for (const e of lastWeek) {
    if (e.event_type === 'page_view') lastWeekVisitors++
  }

  let msg: string
  if (thisWeek.length === 0 && lastWeek.length === 0) {
    msg = "No website analytics yet. Make sure the tracking snippet is installed on your site."
  } else {
    const parts: string[] = [`Your website had ${visitors} visitors this week.`]
    if (clicks > 0) parts.push(`${clicks} people clicked a button.`)
    if (forms > 0) parts.push(`${forms} submitted a form.`)
    if (lastWeekVisitors > 0) {
      const direction = visitors >= lastWeekVisitors ? 'up' : 'down'
      parts.push(`That's ${direction} from ${lastWeekVisitors} visitors last week.`)
    }
    msg = parts.join(' ')
  }

  return twimlResponse(msg)
}

/**
 * Returns a TwiML XML response that Twilio will use to reply to the owner.
 */
function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
