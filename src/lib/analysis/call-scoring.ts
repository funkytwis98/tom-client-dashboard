import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/utils/env'

// Lazily initialized to allow mocking in tests
let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropicApiKey() })
  return _anthropic
}

/**
 * Scores the quality of an AI receptionist call on a scale of 1-10.
 * Very short calls (< 10 seconds) are immediately scored low without calling Claude.
 *
 * Scoring guide:
 * - 9-10: AI fully helped caller, captured lead info, professional throughout
 * - 7-8: AI handled call well, minor imperfections
 * - 4-6: AI repeated itself, misunderstood, or partially helped
 * - 1-3: AI failed to help, caller hung up frustrated, or call was < 10 seconds
 */
export async function scoreCallQuality(
  transcript: string,
  durationMs: number
): Promise<number> {
  // Very short calls indicate an immediate hangup or dropped call — score low
  if (durationMs < 10000) return 2

  const message = await getClient().messages.create({
    model: 'claude-3-5-haiku-20241022',  // Haiku — fast + cheap
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: `Rate the quality of this AI receptionist call on a scale of 1-10.
10 = AI successfully helped caller, captured info, professional throughout
7-9 = AI handled call well with minor issues
4-6 = AI confused, repeated itself, or partially helped
1-3 = AI failed to help, caller frustrated or hung up

Return ONLY a single integer, nothing else.

Transcript:
${transcript}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '5'
  const score = parseInt(text, 10)
  return isNaN(score) ? 5 : Math.max(1, Math.min(10, score))
}
