import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/utils/env'
import type { LeadAnalysis } from '@/types/api'

// Lazily initialized to allow mocking in tests
let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropicApiKey() })
  return _anthropic
}

/**
 * System prompt for call transcript analysis.
 * The closing brace for the JSON schema is included; we append the transcript below.
 */
const ANALYSIS_PROMPT = `Analyze this phone call transcript and extract lead information.

Return a JSON object with these exact fields:
{
  "is_lead": boolean,
  "caller_name": string|null,
  "service_interested": string|null,
  "notes": string|null,
  "urgency": "low"|"medium"|"high"|"urgent",
  "lead_score": number,
  "summary": string,
  "sentiment": "positive"|"neutral"|"negative",
  "requires_callback": boolean
}

Field descriptions:
- is_lead: true if caller has a genuine service need or buying intent
- caller_name: caller's name if explicitly mentioned, null otherwise
- service_interested: primary service they called about (e.g. "tire rotation", "flat repair", "alignment")
- notes: important details about the caller's situation or needs
- urgency: low=informational only, medium=general inquiry, high=this week/clear buying intent, urgent=ASAP/emergency/today
- lead_score: integer 1-10 rating of lead quality
- summary: 1-2 sentence plain English description of the call
- sentiment: caller's emotional tone throughout the call
- requires_callback: true if caller explicitly asked to be called back

Scoring guide:
- 9-10: Urgent need + contact info provided + ready to book
- 7-8: Clear service need + engaged conversation
- 5-6: Interest shown but no urgency or incomplete info
- 3-4: General inquiry, price checking, no commitment
- 1-2: Wrong number, hangup, or no service need

IMPORTANT: Respond with ONLY the JSON object, no markdown, no explanation.

Transcript:
{{TRANSCRIPT}}`

/**
 * Analyzes a call transcript using Claude Haiku and returns structured lead data.
 * Uses JSON mode via prompt engineering (Haiku doesn't support json_object response_format).
 *
 * @throws {SyntaxError} if Claude returns invalid JSON
 */
export async function analyzeCallTranscript(transcript: string): Promise<LeadAnalysis> {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',  // Haiku — fast + cheap for extraction
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{{TRANSCRIPT}}', transcript),
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text) as LeadAnalysis

  // Clamp and validate lead_score — always an integer 1-10
  parsed.lead_score = Math.max(1, Math.min(10, Math.round(parsed.lead_score)))

  return parsed
}
