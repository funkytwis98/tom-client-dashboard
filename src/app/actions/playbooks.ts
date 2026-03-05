'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { reportError } from '@/lib/monitoring/report-error'
import { revalidatePath } from 'next/cache'
import type { SalesPlaybook, PlaybookCategory } from '@/types/domain'

export async function getPlaybooksForClient(clientId: string): Promise<SalesPlaybook[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales_playbooks')
    .select('*')
    .eq('client_id', clientId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as SalesPlaybook[]
}

export async function savePlaybookEntry(entry: {
  id?: string
  client_id: string
  category: PlaybookCategory
  title: string
  trigger_phrase: string | null
  response_script: string
  is_active?: boolean
  priority?: number
}) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  if (entry.id) {
    // Update existing
    const { error } = await supabase
      .from('sales_playbooks')
      .update({
        category: entry.category,
        title: entry.title,
        trigger_phrase: entry.trigger_phrase,
        response_script: entry.response_script,
        is_active: entry.is_active ?? true,
        priority: entry.priority ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)

    if (error) return { error: error.message }
  } else {
    // Insert new
    const { error } = await supabase
      .from('sales_playbooks')
      .insert({
        client_id: entry.client_id,
        category: entry.category,
        title: entry.title,
        trigger_phrase: entry.trigger_phrase,
        response_script: entry.response_script,
        is_active: entry.is_active ?? true,
        priority: entry.priority ?? 0,
      })

    if (error) return { error: error.message }
  }

  // Sync agent prompt (non-blocking)
  syncAgent(entry.client_id)

  revalidatePath(`/clients/${entry.client_id}`)
  return { success: true }
}

export async function deletePlaybookEntry(id: string, clientId: string) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('sales_playbooks')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  // Sync agent prompt (non-blocking)
  syncAgent(clientId)

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

/** Fire-and-forget Retell sync */
function syncAgent(clientId: string) {
  updateRetellAgent(clientId).catch((err) => {
    reportError({
      type: 'retell_sync',
      message: `Playbook sync failed for client ${clientId}: ${err.message}`,
      clientId,
    })
  })
}
