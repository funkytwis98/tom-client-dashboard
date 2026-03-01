'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
