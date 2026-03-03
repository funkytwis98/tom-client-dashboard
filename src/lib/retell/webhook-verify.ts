/**
 * Retell webhook signature verification.
 * TODO: Re-enable once signing key issue is resolved.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function verifyRetellSignature(body: string, signature: string | null, apiKey: string): boolean {
  if (!signature) {
    console.warn('[webhook-verify] No signature provided — skipping verification (TEMP)')
    return true
  }
  console.warn('[webhook-verify] Signature check bypassed (TEMP)')
  return true
}
