import Retell from 'retell-sdk'

/**
 * Verifies the signature on incoming Retell webhook requests
 * using the official Retell SDK.
 */
export function verifyRetellSignature(
  body: string,
  signature: string | null,
  apiKey: string
): boolean {
  if (!signature) return false
  try {
    return Retell.verify(body, apiKey, signature)
  } catch {
    return false
  }
}
