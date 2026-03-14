import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/utils/env'
import type { LeadAnalysis } from '@/types/api'
import type { ReflectionData } from '@/lib/brain/types'

// Lazily initialized to allow mocking in tests
let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropicApiKey() })
  return _anthropic
}

/**
 * Extended analysis result that includes reflection data alongside lead extraction.
 */
export interface AnalysisWithReflection extends LeadAnalysis {
  reflection: {
    confidence_score: number
    knowledge_gaps: string[]
    knowledge_used: string[]
    caller_sentiment: string
    suggested_knowledge: string[]
    pattern_noticed: string | null
    interaction_summary: string
  }
}

/**
 * System prompt for call transcript analysis.
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
- caller_name: the caller's first name (and last if given). Listen carefully for introductions like "this is [name]", "my name is [name]", "it's [name]", or the agent addressing them by name. Return null only if truly never mentioned.
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
 * Enhanced prompt that includes brain context and reflection self-assessment.
 */
const BRAIN_ANALYSIS_PROMPT = `{{BRAIN_CONTEXT}}

---

Now analyze this phone call transcript. You handled this call using the knowledge above.

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
  "requires_callback": boolean,
  "reflection": {
    "confidence_score": integer 1-5,
    "knowledge_gaps": string[],
    "knowledge_used": string[],
    "caller_sentiment": "positive"|"neutral"|"frustrated"|"angry",
    "suggested_knowledge": string[],
    "pattern_noticed": string|null,
    "interaction_summary": string
  }
}

Lead extraction fields:
- is_lead: true if caller has genuine service need or buying intent
- caller_name: caller's name if mentioned
- service_interested: primary service they called about
- notes: important details
- urgency: low/medium/high/urgent
- lead_score: 1-10
- summary: 1-2 sentence description
- sentiment: positive/neutral/negative
- requires_callback: true if caller asked to be called back

Reflection fields:
- confidence_score: 5=handled perfectly, 4=minor uncertainty, 3=improvised, 2=struggled, 1=failed
- knowledge_gaps: questions you couldn't answer from the business knowledge above
- knowledge_used: knowledge topics you relied on
- caller_sentiment: caller's emotional state
- suggested_knowledge: things that should be added to the business knowledge
- pattern_noticed: any recurring pattern, or null
- interaction_summary: one-line summary for future reference

IMPORTANT: Respond with ONLY the JSON object, no markdown, no explanation.

Transcript:
{{TRANSCRIPT}}`

/**
 * Analyzes a call transcript using Claude and returns structured lead data.
 * Original version without brain context.
 */
export async function analyzeCallTranscript(transcript: string): Promise<LeadAnalysis> {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{{TRANSCRIPT}}', transcript),
      },
    ],
  })

  let text = message.content[0].type === 'text' ? message.content[0].text : ''
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  const parsed = JSON.parse(text) as LeadAnalysis
  parsed.lead_score = Math.max(1, Math.min(10, Math.round(parsed.lead_score)))

  return parsed
}

/**
 * Enhanced analysis with brain context and reflection.
 * Uses the brain-assembled prompt for context, returns reflection data alongside leads.
 */
export async function analyzeCallWithBrain(
  transcript: string,
  brainPrompt: string,
  model: string,
): Promise<{ analysis: LeadAnalysis; reflection: ReflectionData | null; inputTokens: number; outputTokens: number }> {
  const prompt = BRAIN_ANALYSIS_PROMPT
    .replace('{{BRAIN_CONTEXT}}', brainPrompt)
    .replace('{{TRANSCRIPT}}', transcript)

  const message = await getClient().messages.create({
    model,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const inputTokens = message.usage.input_tokens
  const outputTokens = message.usage.output_tokens

  let text = message.content[0].type === 'text' ? message.content[0].text : ''
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  const parsed = JSON.parse(text) as AnalysisWithReflection
  parsed.lead_score = Math.max(1, Math.min(10, Math.round(parsed.lead_score)))

  const analysis: LeadAnalysis = {
    is_lead: parsed.is_lead,
    caller_name: parsed.caller_name,
    service_interested: parsed.service_interested,
    notes: parsed.notes,
    urgency: parsed.urgency,
    lead_score: parsed.lead_score,
    summary: parsed.summary,
    sentiment: parsed.sentiment,
    requires_callback: parsed.requires_callback,
  }

  // Extract reflection if present
  let reflection: ReflectionData | null = null
  if (parsed.reflection) {
    const r = parsed.reflection
    reflection = {
      client_id: '', // filled by caller
      capability: 'receptionist',
      confidence_score: Math.max(1, Math.min(5, Math.round(r.confidence_score ?? 3))),
      knowledge_gaps: r.knowledge_gaps ?? [],
      knowledge_used: r.knowledge_used ?? [],
      caller_sentiment: (r.caller_sentiment as ReflectionData['caller_sentiment']) ?? 'neutral',
      suggested_knowledge: r.suggested_knowledge ?? [],
      pattern_noticed: r.pattern_noticed ?? null,
      interaction_summary: r.interaction_summary ?? parsed.summary,
      trigger_type: 'phone_call',
    }
  }

  return { analysis, reflection, inputTokens, outputTokens }
}
