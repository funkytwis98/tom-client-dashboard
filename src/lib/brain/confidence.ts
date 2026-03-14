// Confidence Scoring
// 1-5 scale for interaction quality assessment

/**
 * Confidence score guide:
 * 5 — Handled perfectly, had all info needed
 * 4 — Handled well, minor uncertainty
 * 3 — Adequate, but had to improvise
 * 2 — Struggled, said "I don't know" or improvised significantly
 * 1 — Failed — couldn't help, caller likely frustrated
 *
 * The confidence score is generated as part of the reflection object
 * in the same Claude API call — no extra cost.
 */

/**
 * Build the reflection extraction schema to append to any Claude API call.
 * This gets added to the existing output format so Tom can self-assess.
 */
export const REFLECTION_OUTPUT_SCHEMA = {
  confidence_score: 'integer 1-5: 5=perfect, 4=minor uncertainty, 3=improvised, 2=struggled, 1=failed',
  knowledge_gaps: 'string[]: questions you could not answer well or at all',
  knowledge_used: 'string[]: IDs of knowledge base entries you relied on (if known)',
  caller_sentiment: '"positive" | "neutral" | "frustrated" | "angry"',
  suggested_knowledge: 'string[]: things you think should be added to the knowledge base',
  pattern_noticed: 'string | null: any recurring pattern you observed',
  interaction_summary: 'string: one-line summary of this interaction for future reference',
}

/**
 * Format the reflection schema as instructions for Claude.
 */
export function getReflectionInstructions(): string {
  return `After completing your main task, also include these self-assessment fields in your JSON response:
- "confidence_score": integer 1-5 (5=handled perfectly with all info, 4=handled well with minor uncertainty, 3=adequate but improvised, 2=struggled or said "I don't know", 1=failed to help)
- "knowledge_gaps": array of questions you couldn't answer well
- "knowledge_used": array of knowledge entry IDs you relied on (leave empty if unsure)
- "caller_sentiment": "positive", "neutral", "frustrated", or "angry"
- "suggested_knowledge": array of things you think should be added to the knowledge base
- "pattern_noticed": a recurring pattern you noticed, or null
- "interaction_summary": one-line summary for future reference`
}
