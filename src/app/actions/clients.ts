'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Client } from '@/types/domain'

const NewClientSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  owner_name: z.string().min(1, 'Owner name is required').max(200),
  owner_phone: z.string().min(1, 'Owner phone is required').max(30),
  owner_email: z.string().email().max(200).optional().or(z.literal('')),
  timezone: z.string().default('America/New_York'),
  subscription_tier: z.enum(['standard', 'premium', 'enterprise']).default('standard'),
  phone_number: z.string().max(30).optional().or(z.literal('')),
})

export type NewClientInput = z.infer<typeof NewClientSchema>

export async function createNewClient(formData: NewClientInput) {
  const parsed = NewClientSchema.parse(formData)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (orgError || !org) throw new Error('Organization not found')

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      org_id: org.id,
      name: parsed.name,
      slug: parsed.slug,
      owner_name: parsed.owner_name,
      owner_phone: parsed.owner_phone,
      owner_email: parsed.owner_email || null,
      timezone: parsed.timezone,
      subscription_tier: parsed.subscription_tier,
      phone_number: parsed.phone_number || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/clients')
  return { success: true, clientId: client.id }
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Client[]
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) return null
  return data as Client
}
