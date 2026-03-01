import { NextRequest, NextResponse } from 'next/server'
import { parseOwnerCommand } from '@/lib/notifications/parser'
import { verifyTwilioSignature } from '@/lib/notifications/twilio'
import { createServiceClient } from '@/lib/supabase/service'
import { env } from '@/lib/utils/env'

/**
 * POST /api/webhooks/twilio-sms
 *
 * Handles inbound SMS from Twilio when a business owner texts back.
 * 1. Validates Twilio signature
 * 2. Finds the client by owner_phone
 * 3. Parses the owner's command
 * 4. Updates the most recent lead status if command is actionable
 * 5. Logs owner_response to notifications table
 * 6. Returns TwiML response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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

  // Build params object from form data for signature verification
  const params: Record<string, string> = {}
  formData.forEach((value, key) => {
    params[key] = value
  })

  if (!verifyTwilioSignature(signature, webhookUrl, params)) {
    console.warn('[twilio-sms] Invalid Twilio signature from:', from)
    return new NextResponse('Forbidden', { status: 403 })
  }

  const supabase = createServiceClient()

  // Find the client whose owner matches the sender phone number
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, owner_phone')
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

  // Parse owner command
  const command = parseOwnerCommand(body)

  // Update lead status based on command action
  if (recentNotification?.lead_id && command.action !== 'unknown' && command.action !== 'pause' && command.action !== 'resume') {
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

  // Handle pause/resume by updating client settings
  if (command.action === 'pause' || command.action === 'resume') {
    await supabase
      .from('clients')
      .update({
        settings: { notifications_paused: command.action === 'pause' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id)
  }

  // Log owner_response on the most recent notification
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
    unknown: 'Got it!',
  }

  return twimlResponse(confirmationMessages[command.action] ?? 'Got it!')
}

/**
 * Returns a TwiML XML response that Twilio will use to reply to the owner.
 */
function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
