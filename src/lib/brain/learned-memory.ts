// Layer 4 — Learned Memory
// Fetches learned_data entries within the 90-day staleness window

import { createServiceClient } from '@/lib/supabase/service'
import { MAX_LEARNED_ENTRIES, LEARNED_STALENESS_DAYS } from './constants'
import type { LearnedMemoryEntry } from './types'

/**
 * Load learned data entries for a client within the staleness window.
 * Returns at most MAX_LEARNED_ENTRIES, sorted by most recent first.
 */
export async function loadLearnedMemory(clientId: string): Promise<LearnedMemoryEntry[]> {
  const supabase = createServiceClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - LEARNED_STALENESS_DAYS)

  const { data } = await supabase
    .from('learned_data')
    .select('id, client_id, label, value, confidence, status, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('status', 'confirmed')
    .gte('updated_at', cutoff.toISOString())
    .order('updated_at', { ascending: false })
    .limit(MAX_LEARNED_ENTRIES)

  return (data ?? []) as LearnedMemoryEntry[]
}

/**
 * Format learned memory entries into a prompt section.
 * Returns empty string if no entries (Layer 4 is omitted).
 */
export function formatLearnedMemory(entries: LearnedMemoryEntry[]): string {
  if (entries.length === 0) return ''

  return entries.map(e => `- ${e.label}: ${e.value}`).join('\n')
}
