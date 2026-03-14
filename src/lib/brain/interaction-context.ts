// Layer 3.5 — Interaction Context
// Contact lookup + conversation history for personalization

import { createServiceClient } from '@/lib/supabase/service'
import type { ContactRecord } from './types'

interface InteractionContext {
  contact: ContactRecord | null
  contextText: string
}

/**
 * Look up a contact by phone + client_id and build context text for the prompt.
 * If callerPhone is not provided, returns empty context.
 */
export async function loadInteractionContext(
  clientId: string,
  callerPhone?: string,
  smsThread?: string[],
): Promise<InteractionContext> {
  if (!callerPhone) {
    return { contact: null, contextText: 'This is a new contact. No previous history.' }
  }

  const supabase = createServiceClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .eq('phone', callerPhone)
    .single()

  if (!contact) {
    const lines = ['This is a new caller. No previous contact history.']
    if (smsThread && smsThread.length > 0) {
      lines.push('')
      lines.push('Recent messages in this thread:')
      const recent = smsThread.slice(-5)
      for (const msg of recent) {
        lines.push(`> ${msg}`)
      }
    }
    return { contact: null, contextText: lines.join('\n') }
  }

  const lines: string[] = []

  const name = contact.name ? `Their name is ${contact.name}. ` : ''
  const ordinal = getOrdinal(contact.interaction_count + 1)
  lines.push(`This caller has contacted before. ${name}This is their ${ordinal} interaction.`)

  if (contact.last_interaction_summary) {
    const lastDate = new Date(contact.last_interaction_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    lines.push(`Last time (${lastDate}): ${contact.last_interaction_summary}`)
  }

  if (contact.tags && contact.tags.length > 0) {
    lines.push(`Tags: ${contact.tags.join(', ')}`)
  }

  if (smsThread && smsThread.length > 0) {
    lines.push('')
    lines.push('Recent messages in this thread:')
    const recent = smsThread.slice(-5)
    for (const msg of recent) {
      lines.push(`> ${msg}`)
    }
  }

  return { contact: contact as ContactRecord, contextText: lines.join('\n') }
}

/**
 * Upsert a contact after an interaction.
 */
export async function upsertContact(
  clientId: string,
  phone: string,
  opts: {
    name?: string | null
    interactionSummary?: string
    confidenceScore?: number
  },
): Promise<void> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Check if contact exists
  const { data: existing } = await supabase
    .from('contacts')
    .select('id, interaction_count, tags')
    .eq('client_id', clientId)
    .eq('phone', phone)
    .single()

  if (existing) {
    const newCount = (existing.interaction_count ?? 0) + 1
    const tags = [...(existing.tags ?? [])]

    // Auto-tag based on patterns
    if (newCount >= 3 && !tags.includes('repeat_customer')) {
      tags.push('repeat_customer')
    }
    if (opts.confidenceScore && opts.confidenceScore <= 2 && !tags.includes('needs_attention')) {
      tags.push('needs_attention')
    }

    await supabase
      .from('contacts')
      .update({
        interaction_count: newCount,
        last_interaction_at: now,
        last_interaction_summary: opts.interactionSummary ?? null,
        ...(opts.name ? { name: opts.name } : {}),
        tags,
        updated_at: now,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('contacts').insert({
      client_id: clientId,
      phone,
      name: opts.name ?? null,
      interaction_count: 1,
      last_interaction_at: now,
      last_interaction_summary: opts.interactionSummary ?? null,
      first_contact_at: now,
      tags: [],
    })
  }
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
