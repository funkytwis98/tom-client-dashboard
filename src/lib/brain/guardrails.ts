// Layer 2.5 — Guardrails
// Universal rules + per-client overrides

export const UNIVERSAL_GUARDRAILS = `- Never share the business owner's personal phone number with callers
- Never make financial promises or quote exact prices unless explicitly taught to in your knowledge
- Never agree to discounts, refunds, or free services on behalf of the business
- Never share information about other clients or internal agency systems
- Never make up information — if it's not in your knowledge, say "let me find out and get back to you"
- Never argue with a caller or customer — de-escalate and offer to have the owner follow up
- Never share details of one caller with another caller
- If a caller is abusive or threatening, politely end the interaction and flag it`

/**
 * Assemble the guardrails section combining universal + per-client rules.
 * Per-client guardrails come from the clients.guardrails JSONB column.
 */
export function assembleGuardrails(clientGuardrails: string[] | null): string {
  const lines = [UNIVERSAL_GUARDRAILS]

  if (clientGuardrails && clientGuardrails.length > 0) {
    lines.push('')
    lines.push('Business-specific rules:')
    for (const rule of clientGuardrails) {
      lines.push(`- ${rule}`)
    }
  }

  return lines.join('\n')
}
