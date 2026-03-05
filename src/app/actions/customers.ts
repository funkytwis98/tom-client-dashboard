'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Customer } from '@/types/domain'
import { normalizePhone } from '@/lib/utils/phone'

const CreateCustomerSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email().max(200).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
  tags: z.string().max(500).optional().or(z.literal('')), // comma-separated
  status: z.enum(['active', 'inactive', 'vip']).default('active'),
})

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>

export async function createCustomer(formData: CreateCustomerInput) {
  const parsed = CreateCustomerSchema.parse(formData)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!org) throw new Error('Organization not found')

  // Verify client belongs to org
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', parsed.client_id)
    .eq('org_id', org.id)
    .single()
  if (!client) throw new Error('Client not found')

  const tags = parsed.tags
    ? parsed.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      client_id: parsed.client_id,
      name: parsed.name,
      phone: normalizePhone(parsed.phone) || null,
      email: parsed.email || null,
      notes: parsed.notes || null,
      tags,
      status: parsed.status,
      source: 'manual',
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('A customer with this phone number already exists')
    throw new Error(error.message)
  }

  revalidatePath(`/clients/${parsed.client_id}/customers`)
  revalidatePath('/customers')
  return { success: true, customer: customer as Customer }
}

const UpdateCustomerSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email().max(200).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
  tags: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'vip']).default('active'),
})

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>

export async function updateCustomer(formData: UpdateCustomerInput) {
  const parsed = UpdateCustomerSchema.parse(formData)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tags = parsed.tags
    ? parsed.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const { error } = await supabase
    .from('customers')
    .update({
      name: parsed.name,
      phone: normalizePhone(parsed.phone) || null,
      email: parsed.email || null,
      notes: parsed.notes || null,
      tags,
      status: parsed.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.id)

  if (error) {
    if (error.code === '23505') throw new Error('A customer with this phone number already exists')
    throw new Error(error.message)
  }

  revalidatePath(`/clients/${parsed.client_id}/customers`)
  revalidatePath(`/clients/${parsed.client_id}/customers/${parsed.id}`)
  revalidatePath('/customers')
  return { success: true }
}

export async function deleteCustomer(customerId: string, clientId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Soft delete: set status to inactive
  const { error } = await supabase
    .from('customers')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', customerId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/customers`)
  revalidatePath('/customers')
  return { success: true }
}

export async function getCustomersForClient(
  clientId: string,
  filters?: { status?: Customer['status']; search?: string }
): Promise<Customer[]> {
  const supabase = await createClient()
  let query = supabase
    .from('customers')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Customer[]
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()
  if (error) return null
  return data as Customer
}

export async function getCustomerWithHistory(customerId: string, clientId: string) {
  const supabase = await createClient()

  const [{ data: customer }, { data: leads }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase
      .from('leads')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ])

  if (!customer) return null

  // Find calls matching customer's phone
  let calls: unknown[] = []
  if (customer.phone) {
    const { data: callData } = await supabase
      .from('calls')
      .select('*')
      .eq('client_id', clientId)
      .eq('caller_number', customer.phone)
      .order('created_at', { ascending: false })
      .limit(50)
    calls = callData ?? []
  }

  // Find linked leads (converted from, or matching phone)
  const linkedLeads = (leads ?? []).filter(
    (l: { id: string; phone: string | null }) =>
      l.id === customer.converted_from_lead_id ||
      (customer.phone && l.phone && normalizePhone(l.phone) === normalizePhone(customer.phone))
  )

  return {
    customer: customer as Customer,
    calls,
    leads: linkedLeads,
  }
}

/**
 * Auto-convert a lead to a customer when lead status changes to 'booked' or 'completed'.
 * Checks phone uniqueness — if customer already exists with same phone, skips silently.
 */
export async function autoConvertLeadToCustomer(
  leadId: string,
  clientId: string
): Promise<{ converted: boolean; customerId?: string }> {
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) return { converted: false }

  // Check if customer already exists for this lead
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('converted_from_lead_id', leadId)
    .single()

  if (existing) return { converted: false, customerId: existing.id }

  // Check if customer with same phone already exists for this client
  const phone = normalizePhone(lead.phone)
  if (phone) {
    const { data: phoneMatch } = await supabase
      .from('customers')
      .select('id')
      .eq('client_id', clientId)
      .eq('phone', phone)
      .single()

    if (phoneMatch) return { converted: false, customerId: phoneMatch.id }
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      client_id: clientId,
      name: lead.name || 'Unknown',
      phone: phone || null,
      email: lead.email || null,
      notes: lead.notes || null,
      tags: lead.service_interested ? [lead.service_interested] : [],
      status: 'active',
      source: 'auto_converted',
      converted_from_lead_id: leadId,
    })
    .select('id')
    .single()

  if (error) {
    // Unique constraint violation — customer already exists
    if (error.code === '23505') return { converted: false }
    console.error('[autoConvert] Failed to convert lead to customer:', error)
    return { converted: false }
  }

  revalidatePath(`/clients/${clientId}/customers`)
  revalidatePath('/customers')
  return { converted: true, customerId: customer.id }
}
