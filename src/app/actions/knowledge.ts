'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { reportError } from '@/lib/monitoring/report-error'
import { z } from 'zod'

/**
 * Fire-and-forget Retell sync — logs failures but never throws.
 * Called after knowledge base mutations so the AI prompt stays current.
 */
async function syncRetellInBackground(clientId: string) {
  try {
    // Check if client has a Retell agent configured before attempting sync
    const supabase = await createClient()
    const { data: client } = await supabase
      .from('clients')
      .select('retell_agent_id')
      .eq('id', clientId)
      .single()
    if (!client?.retell_agent_id) {
      console.warn('[knowledge] Skipping Retell sync — no agent_id for client', clientId)
      return
    }
    await updateRetellAgent(clientId)
  } catch (err) {
    console.error('[knowledge] Retell sync failed (non-blocking):', err)
    reportError({
      type: 'retell_sync',
      message: String(err),
      clientId,
    })
  }
}

const KnowledgeEntrySchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  category: z.enum([
    'services',
    'pricing',
    'faq',
    'hours',
    'policies',
    'location',
    'team',
    'promotions',
    'competitors',
  ]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  priority: z.number().int().min(0).max(100).default(0),
  is_active: z.boolean().default(true),
})

export type KnowledgeEntryInput = z.infer<typeof KnowledgeEntrySchema>

/**
 * Create or update a knowledge base entry.
 * If `id` is provided, performs an update; otherwise inserts a new entry.
 * Validates all inputs with Zod. Revalidates the knowledge page on success.
 */
export async function saveKnowledgeEntry(formData: KnowledgeEntryInput) {
  const parsed = KnowledgeEntrySchema.parse(formData)
  const supabase = await createClient()

  const { error, data } = parsed.id
    ? await supabase
        .from('knowledge_base')
        .update({ ...parsed, updated_at: new Date().toISOString() })
        .eq('id', parsed.id)
        .select()
        .single()
    : await supabase.from('knowledge_base').insert(parsed).select().single()

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${parsed.client_id}/knowledge`)
  syncRetellInBackground(parsed.client_id)
  return { success: true, entry: data }
}

/**
 * Soft-delete a knowledge base entry by setting is_active=false.
 * Preserves history and prevents breaking any in-progress agent prompts.
 */
export async function deleteKnowledgeEntry(entryId: string, clientId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('knowledge_base')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', entryId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/knowledge`)
  syncRetellInBackground(clientId)
  return { success: true }
}

/**
 * Bulk-update priorities for drag-and-drop reordering.
 * Runs all updates in parallel for minimal latency.
 */
export async function reorderKnowledgeEntries(
  entries: Array<{ id: string; priority: number }>,
  clientId: string
) {
  const supabase = await createClient()

  // Bulk update priorities in parallel
  const updates = entries.map(({ id, priority }) =>
    supabase
      .from('knowledge_base')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', id)
  )

  await Promise.all(updates)

  revalidatePath(`/clients/${clientId}/knowledge`)
  return { success: true }
}
