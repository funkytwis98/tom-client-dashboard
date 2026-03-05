/**
 * Normalize a phone number to E.164-ish format for consistent matching.
 * Strips non-digit chars, prepends US country code if 10 digits.
 * Returns null for empty/invalid input.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return null
  // US 10-digit → +1
  if (digits.length === 10) return `+1${digits}`
  // Already has country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  // International or other — just prefix with +
  if (digits.length >= 10) return `+${digits}`
  // Too short to be a phone number
  return raw.trim()
}
