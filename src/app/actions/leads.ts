'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Lead } from '@/types/domain'

export async function updateLeadStatus(
  leadId: string,
  status: Lead['status'],
  clientId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/leads`)
  return { success: true }
}

export async function getLeadsForClient(
  clientId: string,
  status?: Lead['status']
): Promise<Lead[]> {
  const supabase = await createClient()
  let query = supabase
    .from('leads')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Lead[]
}
