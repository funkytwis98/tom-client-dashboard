'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Lead } from '@/types/domain'
import { autoConvertLeadToCustomer } from './customers'

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

  // Auto-convert to customer when booked or completed
  if (status === 'booked' || status === 'completed') {
    autoConvertLeadToCustomer(leadId, clientId).catch((err) => {
      console.error('[updateLeadStatus] Auto-convert failed:', err)
    })
  }

  revalidatePath(`/clients/${clientId}/leads`)
  revalidatePath(`/clients/${clientId}/customers`)
  return { success: true }
}

export async function convertLeadToCustomer(
  leadId: string,
  clientId: string
): Promise<{ converted: boolean; customerId?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Update lead status to completed if not already
  await supabase
    .from('leads')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .in('status', ['booked', 'completed'])

  const result = await autoConvertLeadToCustomer(leadId, clientId)

  revalidatePath(`/clients/${clientId}/leads`)
  revalidatePath(`/clients/${clientId}/customers`)
  revalidatePath('/leads')
  revalidatePath('/customers')
  return result
}

export async function getConvertedLeadIds(clientId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('converted_from_lead_id')
    .eq('client_id', clientId)
    .not('converted_from_lead_id', 'is', null)

  return new Set((data ?? []).map((d: { converted_from_lead_id: string }) => d.converted_from_lead_id))
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
