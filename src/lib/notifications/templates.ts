import type { NotificationPayload, DailySummary } from '@/types/api'

/**
 * Formats a hot lead SMS (lead_score >= 7).
 * Can exceed 160 chars — high-value leads warrant a longer message.
 */
export function formatHotLeadSMS(payload: NotificationPayload): string {
  const name = payload.caller_name ?? payload.caller_number ?? 'Unknown caller'
  const service = payload.service ? ` called about ${payload.service}` : ''
  const score = payload.lead_score != null ? `\nScore: ${payload.lead_score}/10. ` : '\n'
  const summary = payload.summary ?? 'No details captured.'
  const callback = payload.caller_number ? `\nCall back ASAP: ${payload.caller_number}` : ''

  const msg = `🔥 Hot lead! ${name}${service}.${score}${summary}${callback}`
  return msg.slice(0, 320)
}

/**
 * Formats a medium-score lead SMS (lead_score 4-6).
 * Aims for single SMS segment (~160 chars).
 */
export function formatMediumLeadSMS(payload: NotificationPayload): string {
  const name = payload.caller_name ?? payload.caller_number ?? 'Someone'
  const service = payload.service ? ` about ${payload.service}` : ''
  const score = payload.lead_score != null ? `\nScore: ${payload.lead_score}/10. ` : '\n'
  const summary = payload.summary ?? ''

  const prefix = `📞 New call from ${name}${service}.${score}`
  const remaining = 300 - prefix.length
  const truncatedSummary = summary && remaining > 10 ? summary.slice(0, remaining) : ''

  return (prefix + truncatedSummary).trim()
}

/**
 * Formats a basic call SMS (low score or no lead data).
 * Minimal info, stays under 160 chars.
 */
export function formatBasicCallSMS(payload: NotificationPayload): string {
  const phone = payload.caller_number ?? 'unknown number'
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const summary = payload.summary ?? 'No details captured.'

  const msg = `📞 Call from ${phone} at ${time}.\n${summary}`
  return msg.slice(0, 300)
}

/**
 * Formats an after-hours call SMS.
 * Tells the owner the caller was informed they'd get a callback.
 */
export function formatAfterHoursSMS(payload: NotificationPayload): string {
  const name = payload.caller_name ?? payload.caller_number ?? 'Unknown caller'
  const service = payload.service ? `: ${payload.service}` : ''
  const summary = payload.summary ?? ''
  const callbackNote = "They know you'll call back during business hours."

  const prefix = `📞 After-hours call from ${name}${service}.\n`
  const remaining = 300 - prefix.length - callbackNote.length - 2
  const truncatedSummary = summary && remaining > 10 ? summary.slice(0, remaining) + '. ' : ''

  return `${prefix}${truncatedSummary}${callbackNote}`
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
