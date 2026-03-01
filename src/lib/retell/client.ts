import Retell from 'retell-sdk'
import { createServiceClient } from '@/lib/supabase/service'
import type { Client } from '@/types/domain'

/**
 * Lazily-initialized Retell SDK client.
 * Exported for use in server-side code only (webhook handlers, agent sync).
 */
export const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY ?? '',
})

/**
 * Given a Retell agent ID, look up which client in our DB owns it.
 * Returns the full Client record, or null if not found.
 * Used in webhook handlers to map incoming calls to the right client.
 */
export async function getClientByAgentId(retellAgentId: string): Promise<Client | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('retell_agent_id', retellAgentId)
    .single()

  if (error || !data) return null
  return data as Client
}
