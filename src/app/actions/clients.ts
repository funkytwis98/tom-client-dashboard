'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Client } from '@/types/domain'
import { createRetellAgent } from '@/lib/retell/agent-builder'
import { getStripeClient } from '@/lib/stripe/client'

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

const UpdateClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Business name is required').max(200),
  owner_name: z.string().min(1, 'Owner name is required').max(200),
  owner_phone: z.string().min(1, 'Owner phone is required').max(30),
  owner_email: z.string().email().max(200).optional().or(z.literal('')),
  timezone: z.string().default('America/New_York'),
  subscription_tier: z.enum(['standard', 'premium', 'enterprise']).default('standard'),
  subscription_status: z.enum(['active', 'paused', 'cancelled']).default('active'),
  phone_number: z.string().max(30).optional().or(z.literal('')),
  retell_agent_id: z.string().max(200).optional().or(z.literal('')),
})

export type UpdateClientInput = z.infer<typeof UpdateClientSchema>

export async function updateClient(formData: UpdateClientInput) {
  const parsed = UpdateClientSchema.parse(formData)
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

  // Verify client belongs to this org
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('id', parsed.id)
    .eq('org_id', org.id)
    .single()

  if (!existing) throw new Error('Client not found')

  const { error } = await supabase
    .from('clients')
    .update({
      name: parsed.name,
      owner_name: parsed.owner_name,
      owner_phone: parsed.owner_phone,
      owner_email: parsed.owner_email || null,
      timezone: parsed.timezone,
      subscription_tier: parsed.subscription_tier,
      subscription_status: parsed.subscription_status,
      phone_number: parsed.phone_number || null,
      retell_agent_id: parsed.retell_agent_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.id)

  if (error) throw new Error(error.message)

  revalidatePath('/clients')
  revalidatePath(`/clients/${parsed.id}`)
  return { success: true }
}

// --- Onboarding Wizard ---

const OnboardSchema = z.object({
  // Step 1: Business Details
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
  // Step 2: AI Receptionist
  agent_name: z.string().min(1).max(100).default('receptionist'),
  voice_id: z.string().min(1, 'Voice is required'),
  greeting: z.string().max(500).optional().or(z.literal('')),
  personality: z.string().max(1000).optional().or(z.literal('')),
  sales_style: z.string().max(1000).optional().or(z.literal('')),
  escalation_rules: z.string().max(1000).optional().or(z.literal('')),
  // Step 3: Knowledge Base
  kb_services: z.string().max(5000).optional().or(z.literal('')),
  kb_hours: z.string().max(2000).optional().or(z.literal('')),
  kb_faq: z.string().max(5000).optional().or(z.literal('')),
  // Step 4: Phone
  area_code: z.string().regex(/^\d{3}$/, 'Must be a 3-digit area code').optional().or(z.literal('')),
})

export type OnboardInput = z.infer<typeof OnboardSchema>

export async function onboardClient(
  formData: OnboardInput,
): Promise<{ success: true; clientId: string } | { success: false; clientId?: string; error: string }> {
  const parsed = OnboardSchema.parse(formData)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (orgError || !org) return { success: false, error: 'Organization not found' }

  // 1. Insert client
  const { data: client, error: clientError } = await supabase
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
    })
    .select('id')
    .single()

  if (clientError || !client) return { success: false, error: clientError?.message ?? 'Failed to create client' }

  const clientId = client.id

  // 2. Create Stripe customer (non-blocking — if it fails, can be added from billing tab)
  try {
    const stripe = getStripeClient()
    const customer = await stripe.customers.create({
      name: parsed.name,
      email: parsed.owner_email || undefined,
      phone: parsed.owner_phone || undefined,
      metadata: { client_id: clientId, org_id: org.id },
    })
    await supabase
      .from('clients')
      .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
      .eq('id', clientId)
  } catch (err) {
    console.error('[onboard] Stripe customer creation failed:', err)
    // Non-fatal — client is created, Stripe customer can be added later
  }

  // 3. Upsert agent_config
  const { error: agentError } = await supabase.from('agent_config').insert({
    client_id: clientId,
    agent_name: parsed.agent_name || 'receptionist',
    greeting: parsed.greeting || `Thanks for calling ${parsed.name}, how can I help you?`,
    personality: parsed.personality || 'friendly, professional, and helpful',
    sales_style: parsed.sales_style || 'consultative — ask good questions, understand the need, suggest solutions',
    escalation_rules: parsed.escalation_rules || null,
    voice_id: parsed.voice_id,
  })

  if (agentError) {
    console.error('[onboard] agent_config insert failed:', agentError)
    return { success: false, clientId, error: 'Failed to save agent config. You can configure it from the client page.' }
  }

  // 4. Insert knowledge base entries
  const kbEntries: Array<{ client_id: string; category: string; title: string; content: string; priority: number }> = []
  if (parsed.kb_services?.trim()) {
    kbEntries.push({ client_id: clientId, category: 'services', title: 'Services & Pricing', content: parsed.kb_services.trim(), priority: 10 })
  }
  if (parsed.kb_hours?.trim()) {
    kbEntries.push({ client_id: clientId, category: 'hours', title: 'Business Hours', content: parsed.kb_hours.trim(), priority: 9 })
  }
  if (parsed.kb_faq?.trim()) {
    kbEntries.push({ client_id: clientId, category: 'faq', title: 'Frequently Asked Questions', content: parsed.kb_faq.trim(), priority: 8 })
  }

  if (kbEntries.length > 0) {
    const { error: kbError } = await supabase.from('knowledge_base').insert(kbEntries)
    if (kbError) {
      console.error('[onboard] knowledge_base insert failed:', kbError)
    }
  }

  // 5. Create Retell agent + phone number
  let retellError: string | null = null
  try {
    await createRetellAgent(
      clientId,
      parsed.voice_id,
      parsed.area_code ? parseInt(parsed.area_code, 10) : undefined,
    )
  } catch (err) {
    console.error('[onboard] Retell setup failed:', err)
    retellError = err instanceof Error ? err.message : 'Retell agent setup failed'
  }

  revalidatePath('/clients')

  if (retellError) {
    return {
      success: false,
      clientId,
      error: `Client created but Retell setup failed: ${retellError}. You can retry from the agent config page.`,
    }
  }

  return { success: true, clientId }
}
