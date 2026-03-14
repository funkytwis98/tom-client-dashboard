import { createServiceClient } from '@/lib/supabase/service'
import { isTopicInKB } from './kb-cross-reference'

const JUNK_PHRASES = [
  'no caller interaction',
  'greeting only',
  'no caller response',
  'transcript incomplete',
  'call disconnected immediately',
]

const MIN_CONFIDENCE_SCORE = 3

function isJunkReflection(reflection: {
  confidence_score: number | null
  interaction_summary: string | null
}): boolean {
  if (reflection.confidence_score != null && reflection.confidence_score < MIN_CONFIDENCE_SCORE) {
    return true
  }
  const summary = (reflection.interaction_summary ?? '').toLowerCase()
  return JUNK_PHRASES.some(phrase => summary.includes(phrase))
}

/**
 * Process unprocessed brain_reflections into learning_proposals and unanswered_questions.
 * Uses service client so it can be called from webhook handlers (no user session).
 */
export async function generateProposalsForClient(clientId: string): Promise<{
  proposals: number
  questions: number
  reflections_processed: number
}> {
  const supabase = createServiceClient()

  // 1. Fetch unprocessed reflections
  const { data: allReflections } = await supabase
    .from('brain_reflections')
    .select('*')
    .eq('client_id', clientId)
    .eq('processed', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!allReflections || allReflections.length === 0) {
    return { proposals: 0, questions: 0, reflections_processed: 0 }
  }

  // Filter out junk reflections (dropped/incomplete calls)
  const reflections = allReflections.filter(r => !isJunkReflection(r))
  const junkIds = allReflections.filter(r => isJunkReflection(r)).map(r => r.id)

  // Mark junk reflections as processed so they don't come back
  if (junkIds.length > 0) {
    await supabase
      .from('brain_reflections')
      .update({ processed: true })
      .in('id', junkIds)
  }

  if (reflections.length === 0) {
    return { proposals: 0, questions: 0, reflections_processed: allReflections.length }
  }

  // 2. Get dismissed hashes
  const { data: dismissed } = await supabase
    .from('learning_proposals')
    .select('dismissed_hash')
    .eq('client_id', clientId)
    .eq('status', 'dismissed')
    .not('dismissed_hash', 'is', null)

  const dismissedHashes = new Set(
    (dismissed ?? []).map((d: { dismissed_hash: string }) => d.dismissed_hash)
  )

  // 3. Get existing questions
  const { data: existingQuestions } = await supabase
    .from('unanswered_questions')
    .select('question')
    .eq('client_id', clientId)

  const existingQSet = new Set(
    (existingQuestions ?? []).map((q: { question: string }) => q.question.toLowerCase().trim())
  )

  let proposalCount = 0
  let questionCount = 0

  for (const reflection of reflections) {
    const gaps: string[] = reflection.knowledge_gaps ?? []
    const suggestions: string[] = reflection.suggested_knowledge ?? []

    for (const gap of gaps) {
      const hash = simpleHash(gap)
      if (dismissedHashes.has(hash)) continue

      // Skip if already covered in KB
      const gapInKB = await isTopicInKB(clientId, gap)
      if (gapInKB) {
        dismissedHashes.add(hash)
        continue
      }

      await supabase.from('learning_proposals').insert({
        client_id: clientId,
        proposal_type: 'knowledge_gap',
        title: gap,
        description: reflection.interaction_summary ?? null,
        proposed_entry: { category: 'faq', title: gap, content: '' },
        source_reflection_ids: [reflection.id],
        status: 'pending',
        dismissed_hash: hash,
      })
      proposalCount++
      dismissedHashes.add(hash)

      const normalizedGap = gap.toLowerCase().trim()
      if (!existingQSet.has(normalizedGap)) {
        await supabase.from('unanswered_questions').insert({
          client_id: clientId,
          call_id: null,
          question: gap,
          context: reflection.interaction_summary ?? null,
          status: 'pending',
        })
        existingQSet.add(normalizedGap)
        questionCount++
      }
    }

    for (const suggestion of suggestions) {
      const hash = simpleHash(suggestion)
      if (dismissedHashes.has(hash)) continue

      // Skip if already covered in KB
      const suggestionInKB = await isTopicInKB(clientId, suggestion)
      if (suggestionInKB) {
        dismissedHashes.add(hash)
        continue
      }

      const topic = suggestion.toLowerCase()
      await supabase.from('learning_proposals').insert({
        client_id: clientId,
        proposal_type: 'suggestion',
        title: suggestion,
        description: reflection.interaction_summary ?? null,
        proposed_entry: {
          category: 'faq',
          title: suggestion,
          content: suggestion,
          before_example: `I don't have specific information about ${topic}. Let me have someone call you back.`,
          after_example: `Based on what I know, ${suggestion.toLowerCase()}. Would you like to schedule a time to come in?`,
        },
        source_reflection_ids: [reflection.id],
        status: 'pending',
        dismissed_hash: hash,
      })
      proposalCount++
      dismissedHashes.add(hash)
    }
  }

  // Mark all processed
  await supabase
    .from('brain_reflections')
    .update({ processed: true })
    .in('id', reflections.map(r => r.id))

  return { proposals: proposalCount, questions: questionCount, reflections_processed: allReflections.length }
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
