// Reflection Pipeline
// Post-interaction reflection + weekly learning pass

import { createServiceClient } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/utils/env'
import { REFLECTION_MODEL } from './constants'
import type { ReflectionData } from './types'

let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropicApiKey() })
  return _anthropic
}

/**
 * Write a reflection to the brain_reflections table after an interaction.
 */
export async function writeReflection(data: ReflectionData): Promise<void> {
  const supabase = createServiceClient()

  await supabase.from('brain_reflections').insert({
    client_id: data.client_id,
    capability: data.capability,
    confidence_score: data.confidence_score,
    knowledge_gaps: data.knowledge_gaps,
    knowledge_used: data.knowledge_used,
    caller_sentiment: data.caller_sentiment,
    suggested_knowledge: data.suggested_knowledge,
    pattern_noticed: data.pattern_noticed,
    interaction_summary: data.interaction_summary,
    trigger_type: data.trigger_type,
    processed: false,
  })
}

/**
 * Weekly learning pass — processes reflections into proposals.
 * Runs once per week per client via cron.
 */
export async function processWeeklyLearning(clientId: string): Promise<number> {
  const supabase = createServiceClient()

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Fetch unprocessed reflections from the past week
  const { data: reflections } = await supabase
    .from('brain_reflections')
    .select('*')
    .eq('client_id', clientId)
    .eq('processed', false)
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  if (!reflections || reflections.length === 0) return 0

  // Get existing dismissed hashes to avoid re-proposing
  const { data: dismissed } = await supabase
    .from('learning_proposals')
    .select('dismissed_hash')
    .eq('client_id', clientId)
    .eq('status', 'dismissed')
    .not('dismissed_hash', 'is', null)

  const dismissedHashes = new Set((dismissed ?? []).map(d => d.dismissed_hash))

  // Send reflections to Claude for analysis
  const reflectionSummary = reflections.map(r => ({
    capability: r.capability,
    confidence: r.confidence_score,
    gaps: r.knowledge_gaps,
    suggestions: r.suggested_knowledge,
    pattern: r.pattern_noticed,
    summary: r.interaction_summary,
    sentiment: r.caller_sentiment,
  }))

  const message = await getClient().messages.create({
    model: REFLECTION_MODEL,
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Review these interaction reflections from the past week. Identify the top 3-5 actionable insights.

For each insight, return a JSON array of objects with:
- "type": "knowledge_entry" | "learned_insight" | "operator_flag"
- "title": short title
- "description": explanation
- "knowledge_type": "fact" | "behavior" | "policy" (only for knowledge_entry type)
- "hash": a short unique string to identify this insight (for dedup)

Return ONLY a JSON array, no markdown.

Reflections:
${JSON.stringify(reflectionSummary, null, 2)}`,
    }],
  })

  let text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  let proposals: Array<{
    type: string
    title: string
    description: string
    knowledge_type?: string
    hash: string
  }>

  try {
    proposals = JSON.parse(text)
  } catch {
    console.error('[weekly-learning] Failed to parse Claude response:', text)
    return 0
  }

  if (!Array.isArray(proposals)) return 0

  // Filter out previously dismissed proposals
  const newProposals = proposals.filter(p => !dismissedHashes.has(p.hash))

  // Insert new proposals
  const reflectionIds = reflections.map(r => r.id)

  for (const proposal of newProposals) {
    await supabase.from('learning_proposals').insert({
      client_id: clientId,
      proposal_type: proposal.type,
      title: proposal.title,
      description: proposal.description,
      proposed_entry: proposal.knowledge_type
        ? { type: proposal.knowledge_type, title: proposal.title, content: proposal.description }
        : null,
      source_reflection_ids: reflectionIds,
      status: 'pending',
      dismissed_hash: proposal.hash,
    })
  }

  // Mark reflections as processed
  await supabase
    .from('brain_reflections')
    .update({ processed: true })
    .in('id', reflectionIds)

  return newProposals.length
}
