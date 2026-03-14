import { createServiceClient } from '@/lib/supabase/service'

/**
 * Extract meaningful keywords from a text string for KB matching.
 * Filters out common stop words and short words.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'the', 'a', 'an', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'not', 'no', 'but', 'or', 'and', 'if', 'then', 'so', 'too', 'very',
    'just', 'about', 'above', 'after', 'before', 'between', 'into', 'through',
    'during', 'with', 'without', 'for', 'from', 'of', 'on', 'at', 'to', 'in',
    'out', 'up', 'down', 'this', 'that', 'these', 'those', 'what', 'which',
    'who', 'whom', 'how', 'when', 'where', 'why', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'also',
    'only', 'same', 'here', 'there', 'now', 'back', 'know', 'dont', "don't",
    'didn', "didn't", 'wasn', "wasn't", 'provided', 'business', 'knowledge',
    'quoted', 'information', 'specific', 'details', 'caller', 'asked',
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w))
}

/**
 * Check if a gap/suggestion topic is already covered in the KB.
 * Returns true if the topic appears to be addressed.
 */
export async function isTopicInKB(clientId: string, topicText: string): Promise<boolean> {
  const keywords = extractKeywords(topicText)
  if (keywords.length === 0) return false

  const supabase = createServiceClient()

  // Build ILIKE conditions for each keyword
  // A topic is "covered" if at least 2 keywords match (or 1 if only 1 keyword)
  const minMatches = Math.min(2, keywords.length)

  // Check services_pricing
  for (const keyword of keywords) {
    const pattern = `%${keyword}%`
    const { count: servicesCount } = await supabase
      .from('services_pricing')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_active', true)
      .or(`service_name.ilike.${pattern},notes.ilike.${pattern},price_text.ilike.${pattern}`)

    if (servicesCount && servicesCount > 0) {
      // Found a service match — check if enough keywords match the same service
      const matchCount = await countKeywordMatches(supabase, clientId, keywords, 'services_pricing')
      if (matchCount >= minMatches) return true
    }
  }

  // Check knowledge_base
  for (const keyword of keywords) {
    const pattern = `%${keyword}%`
    const { count: kbCount } = await supabase
      .from('knowledge_base')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_active', true)
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)

    if (kbCount && kbCount > 0) {
      const matchCount = await countKeywordMatches(supabase, clientId, keywords, 'knowledge_base')
      if (matchCount >= minMatches) return true
    }
  }

  // Check business_hours (for schedule-related gaps)
  const scheduleKeywords = ['hours', 'schedule', 'open', 'close', 'closing', 'opening', 'weekend', 'saturday', 'sunday']
  const hasScheduleKeyword = keywords.some(k => scheduleKeywords.includes(k))
  if (hasScheduleKeyword) {
    const { count: hoursCount } = await supabase
      .from('business_hours')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)

    if (hoursCount && hoursCount > 0) return true
  }

  return false
}

async function countKeywordMatches(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string,
  keywords: string[],
  table: 'services_pricing' | 'knowledge_base'
): Promise<number> {
  let matches = 0
  for (const keyword of keywords) {
    const pattern = `%${keyword}%`
    let query

    if (table === 'services_pricing') {
      query = supabase
        .from('services_pricing')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)
        .or(`service_name.ilike.${pattern},notes.ilike.${pattern},price_text.ilike.${pattern}`)
    } else {
      query = supabase
        .from('knowledge_base')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)
        .or(`title.ilike.${pattern},content.ilike.${pattern}`)
    }

    const { count } = await query
    if (count && count > 0) matches++
  }
  return matches
}

/**
 * Clean up stale proposals and unanswered questions that are already addressed in KB.
 * Returns count of items cleaned up.
 */
export async function cleanupStaleProposals(clientId: string): Promise<{
  proposalsCleaned: number
  questionsCleaned: number
}> {
  const supabase = createServiceClient()

  // Fetch all pending proposals
  const { data: pendingProposals } = await supabase
    .from('learning_proposals')
    .select('id, title')
    .eq('client_id', clientId)
    .eq('status', 'pending')

  // Fetch all pending questions
  const { data: pendingQuestions } = await supabase
    .from('unanswered_questions')
    .select('id, question')
    .eq('client_id', clientId)
    .eq('status', 'pending')

  let proposalsCleaned = 0
  let questionsCleaned = 0

  // Check each proposal against KB
  if (pendingProposals) {
    for (const proposal of pendingProposals) {
      const inKB = await isTopicInKB(clientId, proposal.title)
      if (inKB) {
        await supabase
          .from('learning_proposals')
          .update({ status: 'already_addressed', reviewed_at: new Date().toISOString() })
          .eq('id', proposal.id)
        proposalsCleaned++
      }
    }
  }

  // Check each question against KB
  if (pendingQuestions) {
    for (const question of pendingQuestions) {
      const inKB = await isTopicInKB(clientId, question.question)
      if (inKB) {
        await supabase
          .from('unanswered_questions')
          .update({ status: 'already_addressed', updated_at: new Date().toISOString() })
          .eq('id', question.id)
        questionsCleaned++
      }
    }
  }

  return { proposalsCleaned, questionsCleaned }
}
