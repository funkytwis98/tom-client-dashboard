/**
 * Retell webhook signature verification.
 * TODO: Re-enable once signing key issue is resolved.
 */
export function verifyRetellSignature(
  _body: string,
  signature: string | null,
  _apiKey: string
): boolean {
  if (!signature) {
    console.warn('[webhook-verify] No signature provided — skipping verification (TEMP)')
    return true
  }
  console.warn('[webhook-verify] Signature check bypassed (TEMP)')
  return true
}
