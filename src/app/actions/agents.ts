'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateRetellAgent } from '@/lib/retell/agent-builder'
import { z } from 'zod'

const AgentConfigSchema = z.object({
  client_id: z.string().uuid(),
  agent_name: z.string().min(1).max(50),
  greeting: z.string().max(500).nullable(),
  personality: z.string().max(1000).nullable(),
  sales_style: z.string().max(1000).nullable(),
  escalation_rules: z.string().max(1000).nullable(),
  voicemail_message: z.string().max(500).nullable(),
  voice_id: z.string().nullable(),
  language: z.string().default('en-US'),
  custom_instructions: z.string().max(2000).nullable(),
})

export type AgentConfigInput = z.infer<typeof AgentConfigSchema>

/**
 * Upsert agent config for a client.
 * Validates input with Zod, then saves to agent_config table.
 * Revalidates the agent config page on success.
 */
export async function updateAgentConfig(formData: AgentConfigInput) {
  const parsed = AgentConfigSchema.parse(formData)
  const supabase = await createClient()

  const { error } = await supabase
    .from('agent_config')
    .upsert(
      { ...parsed, updated_at: new Date().toISOString() },
      { onConflict: 'client_id' }
    )

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${parsed.client_id}/agent`)
  return { success: true }
}

/**
 * Push the rebuilt agent prompt and voice config to Retell API.
 * Should be called after updateAgentConfig() or after knowledge base changes.
 */
export async function syncRetellAgent(clientId: string) {
  await updateRetellAgent(clientId)
  return { success: true }
}
