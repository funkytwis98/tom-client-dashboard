import type { BusinessHours } from '@/types/domain'

/**
 * Checks whether a given timestamp falls outside the client's business hours.
 *
 * @param businessHours  Per-day open/close windows. null = always open (return false).
 * @param timestampMs    Unix milliseconds of the moment to check.
 * @param timezone       IANA timezone string, e.g. 'America/New_York'.
 * @returns true if the timestamp is outside business hours (i.e. after-hours).
 */
export function isAfterHours(
  businessHours: BusinessHours | null,
  timestampMs: number,
  timezone: string
): boolean {
  if (!businessHours) return false

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  type DayKey = (typeof dayNames)[number]

  const date = new Date(timestampMs)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const weekdayPart = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase() ?? ''
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minStr = parts.find((p) => p.type === 'minute')?.value ?? '00'

  // formatToParts weekday: 'short' gives "Mon", "Tue", etc. — take first 3 lowercase chars
  const dayKey = dayNames.find((d) => d === weekdayPart.substring(0, 3)) as DayKey | undefined
  if (!dayKey) return false

  const hours = businessHours[dayKey]
  if (!hours || hours.closed) return true

  // Handle '24:00' style from formatToParts (midnight)
  const currentHour = parseInt(hourStr, 10) % 24
  const currentMin = parseInt(minStr, 10)
  const current = currentHour * 60 + currentMin

  const openParts = hours.open.split(':')
  const closeParts = hours.close.split(':')
  const open = parseInt(openParts[0], 10) * 60 + parseInt(openParts[1], 10)
  const close = parseInt(closeParts[0], 10) * 60 + parseInt(closeParts[1], 10)

  return current < open || current >= close
}
