// Layer 3 — Client Knowledge
// Fetches client data + typed knowledge base entries from Supabase

import { createServiceClient } from '@/lib/supabase/service'
import { MAX_KNOWLEDGE_ENTRIES } from './constants'
import type { KnowledgeEntryWithType, KnowledgeType } from './types'

interface ClientData {
  id: string
  name: string
  owner_name: string | null
  address: { street: string; city: string; state: string; zip: string } | null
  business_hours: Record<string, { open: string | null; close: string | null; closed?: boolean }> | null
  website_domain: string | null
  timezone: string
  subscription_tier: string
  guardrails: string[] | null
  capability_overrides: Record<string, unknown> | null
}

interface ClientKnowledge {
  client: ClientData
  facts: KnowledgeEntryWithType[]
  behaviors: KnowledgeEntryWithType[]
  policies: KnowledgeEntryWithType[]
  knowledgeEntryIds: string[]
}

/**
 * Fetches client info and knowledge base entries in a single parallel query.
 * Knowledge base entries are sorted by usage_count DESC, then created_at DESC,
 * limited to MAX_KNOWLEDGE_ENTRIES, and grouped by type.
 */
export async function loadClientKnowledge(clientId: string): Promise<ClientKnowledge> {
  const supabase = createServiceClient()

  const [clientRes, kbRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, owner_name, address, business_hours, website_domain, timezone, subscription_tier, guardrails, capability_overrides')
      .eq('id', clientId)
      .single(),
    supabase
      .from('knowledge_base')
      .select('id, client_id, category, title, content, priority, is_active, type, usage_count, last_used_at')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MAX_KNOWLEDGE_ENTRIES),
  ])

  if (clientRes.error || !clientRes.data) {
    throw new Error(`Client ${clientId} not found: ${clientRes.error?.message}`)
  }

  const entries = (kbRes.data ?? []) as KnowledgeEntryWithType[]

  const facts: KnowledgeEntryWithType[] = []
  const behaviors: KnowledgeEntryWithType[] = []
  const policies: KnowledgeEntryWithType[] = []
  const knowledgeEntryIds: string[] = []

  for (const entry of entries) {
    knowledgeEntryIds.push(entry.id)
    const entryType: KnowledgeType = entry.type ?? 'fact'
    if (entryType === 'behavior') {
      behaviors.push(entry)
    } else if (entryType === 'policy') {
      policies.push(entry)
    } else {
      facts.push(entry)
    }
  }

  return {
    client: clientRes.data as ClientData,
    facts,
    behaviors,
    policies,
    knowledgeEntryIds,
  }
}

/**
 * Format client info into a prompt section.
 */
export function formatClientInfo(client: ClientData): string {
  const lines: string[] = []

  lines.push(`Business: ${client.name}`)
  if (client.owner_name) lines.push(`Owner: ${client.owner_name}`)

  if (client.address) {
    const a = client.address
    lines.push(`Location: ${a.street}, ${a.city}, ${a.state} ${a.zip}`)
  }

  if (client.website_domain) {
    lines.push(`Website: ${client.website_domain}`)
  }

  if (client.business_hours) {
    lines.push('')
    lines.push('Business Hours:')
    const days: Array<[string, string]> = [
      ['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'],
      ['thursday', 'Thursday'], ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday'],
    ]
    for (const [key, label] of days) {
      const h = client.business_hours[key]
      if (!h || h.closed || !h.open || !h.close) {
        lines.push(`  ${label}: Closed`)
      } else {
        lines.push(`  ${label}: ${h.open} - ${h.close}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Format typed knowledge entries into prompt sections.
 */
export function formatKnowledgeEntries(entries: KnowledgeEntryWithType[]): string {
  if (entries.length === 0) return ''
  return entries.map(e => `- ${e.title}: ${e.content}`).join('\n')
}
