import crypto from 'crypto'

/**
 * Verifies the HMAC-SHA256 signature on incoming Retell webhook requests.
 * Retell signs the raw request body with your API key and sends the hex digest
 * in the `x-retell-signature` header.
 *
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyRetellSignature(
  body: string,
  signature: string | null,
  apiKey: string
): boolean {
  if (!signature) return false
  try {
    const expected = crypto.createHmac('sha256', apiKey).update(body).digest('hex')
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expected, 'hex')
    if (sigBuffer.length !== expectedBuffer.length) return false
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}
