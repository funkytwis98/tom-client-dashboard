/**
 * Retell webhook signature verification.
 * TODO: Re-enable once signing key issue is resolved.
 */
export function verifyRetellSignature(
  body: string,
  signature: string | null,
  apiKey: string
): boolean {
  if (!signature) {
    console.warn('[webhook-verify] No signature provided — skipping verification (TEMP)')
    return true
  }
  // Temporarily accept all signed requests to debug pipeline
  console.warn('[webhook-verify] Signature check bypassed (TEMP)')
  return true
}
