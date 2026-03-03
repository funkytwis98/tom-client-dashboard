import Retell from 'retell-sdk'

/**
 * Verifies the signature on incoming Retell webhook requests
 * using the official Retell SDK.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function verifyRetellSignature(body: string, signature: string | null, apiKey: string): boolean {
  if (!signature) return false
  try {
    return Retell.verify(body, apiKey, signature)
  } catch (err) {
    console.error('[webhook-verify] Verification error:', err)
    return false
  }
}
