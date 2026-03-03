import type { NotificationPayload, DailySummary } from '@/types/api'

/**
 * Formats an urgent lead SMS alert to the business owner.
 * Score 9-10 = urgent. Keep under 300 chars.
 */
export function formatUrgentLeadSMS(payload: NotificationPayload): string {
  const name = payload.caller_name ?? 'Unknown caller'
  const service = payload.service ?? 'unknown service'
  const score = payload.lead_score ?? '?'
  const phone = payload.caller_number ?? 'no number'

  const parts = [`URGENT: ${name} called about ${service}. Score: ${score}/10. Call back: ${phone}.`]

  if (payload.summary) {
    // Truncate summary to keep total under 300 chars
    const prefix = parts[0]
    const remaining = 295 - prefix.length - 1  // 1 for space
    if (remaining > 20) {
      parts.push(payload.summary.slice(0, remaining))
    }
  }

  return parts.join(' ')
}

/**
 * Formats a new lead SMS alert to the business owner.
 * Standard (non-urgent) lead notification. Keep under 300 chars.
 */
export function formatNewLeadSMS(payload: NotificationPayload): string {
  const name = payload.caller_name ?? 'Someone'
  const service = payload.service ?? 'your services'
  const score = payload.lead_score != null ? ` Score: ${payload.lead_score}/10.` : ''
  const phone = payload.caller_number ? ` Callback: ${payload.caller_number}.` : ''

  const parts = [`New lead: ${name} called about ${service}.${score}${phone}`]

  if (payload.summary) {
    const prefix = parts[0]
    const remaining = 295 - prefix.length - 1
    if (remaining > 20) {
      parts.push(payload.summary.slice(0, remaining))
    }
  }

  return parts.join(' ')
}

/**
 * Formats a missed call SMS notification to the business owner.
 * Includes caller number, time, and optional summary.
 */
export function formatMissedCallSMS(payload: NotificationPayload): string {
  const phone = payload.caller_number ?? 'unknown number'
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const parts = [`Missed call from ${phone} at ${time}.`]

  if (payload.summary) {
    const prefix = parts[0]
    const remaining = 295 - prefix.length - 1
    if (remaining > 20) {
      parts.push(payload.summary.slice(0, remaining))
    }
  }

  return parts.join(' ')
}

/**
 * Formats a daily summary SMS to the business owner.
 * Includes totals for calls, leads, and bookings. Optional top lead.
 */
export function formatDailySummarySMS(summary: DailySummary): string {
  const parts = [
    `Daily summary: ${summary.total_calls} calls, ${summary.new_leads} new leads, ${summary.booked} booked.`,
  ]

  if (summary.top_lead) {
    const { name, service, score } = summary.top_lead
    const leadName = name ?? 'Unknown'
    const leadService = service ?? 'general inquiry'
    const topLeadText = `Best lead: ${leadName} (${leadService}, score ${score}/10)`

    const prefix = parts[0]
    const remaining = 295 - prefix.length - 1
    if (topLeadText.length <= remaining) {
      parts.push(topLeadText)
    }
  }

  return parts.join(' ')
}
