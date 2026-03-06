'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { WebsiteConfig, WebsiteContentBlock, WebsiteSection } from '@/types/website'

// ── Auth helper ──────────────────────────────────────────────

async function verifyClientAccess(clientId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!org) throw new Error('Organization not found')

  const { data: client } = await supabase
    .from('clients')
    .select('id, slug')
    .eq('id', clientId)
    .eq('org_id', org.id)
    .single()
  if (!client) throw new Error('Client not found')

  return { supabase, client }
}

// ── Website Config ───────────────────────────────────────────

export async function getWebsiteConfig(clientId: string): Promise<WebsiteConfig | null> {
  const { supabase } = await verifyClientAccess(clientId)
  const { data } = await supabase
    .from('website_config')
    .select('*')
    .eq('client_id', clientId)
    .single()
  return data as WebsiteConfig | null
}

export async function upsertWebsiteConfig(
  clientId: string,
  updates: Partial<Omit<WebsiteConfig, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
) {
  const { supabase, client } = await verifyClientAccess(clientId)

  // Check if config exists
  const { data: existing } = await supabase
    .from('website_config')
    .select('id')
    .eq('client_id', clientId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('website_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
    if (error) throw new Error(`Failed to update config: ${error.message}`)
  } else {
    const { error } = await supabase
      .from('website_config')
      .insert({ client_id: clientId, ...updates })
    if (error) throw new Error(`Failed to create config: ${error.message}`)
  }

  revalidatePath(`/sites/${client.slug}`)
  revalidatePath(`/clients/${clientId}/website`)
  return { success: true }
}

export async function togglePublished(clientId: string) {
  const { supabase, client } = await verifyClientAccess(clientId)

  const { data: config } = await supabase
    .from('website_config')
    .select('is_published')
    .eq('client_id', clientId)
    .single()

  if (!config) throw new Error('Website config not found — save settings first')

  const { error } = await supabase
    .from('website_config')
    .update({
      is_published: !config.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq('client_id', clientId)

  if (error) throw new Error(`Failed to toggle published: ${error.message}`)

  revalidatePath(`/sites/${client.slug}`)
  revalidatePath(`/clients/${clientId}/website`)
  return { published: !config.is_published }
}

// ── Website Content ──────────────────────────────────────────

export async function getWebsiteContentForClient(
  clientId: string,
): Promise<WebsiteContentBlock[]> {
  const { supabase } = await verifyClientAccess(clientId)
  const { data } = await supabase
    .from('website_content')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })
  return (data ?? []) as WebsiteContentBlock[]
}

export async function saveWebsiteContent(
  clientId: string,
  section: WebsiteSection,
  content: Record<string, unknown>,
  contentId?: string,
) {
  const { supabase, client } = await verifyClientAccess(clientId)

  if (contentId) {
    const { error } = await supabase
      .from('website_content')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contentId)
      .eq('client_id', clientId)
    if (error) throw new Error(`Failed to update content: ${error.message}`)
  } else {
    // Upsert by section — one content block per section
    const { data: existing } = await supabase
      .from('website_content')
      .select('id')
      .eq('client_id', clientId)
      .eq('section', section)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('website_content')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw new Error(`Failed to update content: ${error.message}`)
    } else {
      const { error } = await supabase
        .from('website_content')
        .insert({ client_id: clientId, section, content })
      if (error) throw new Error(`Failed to create content: ${error.message}`)
    }
  }

  revalidatePath(`/sites/${client.slug}`)
  revalidatePath(`/clients/${clientId}/website`)
  return { success: true }
}

export async function deleteWebsiteContent(clientId: string, contentId: string) {
  const { supabase, client } = await verifyClientAccess(clientId)

  const { error } = await supabase
    .from('website_content')
    .delete()
    .eq('id', contentId)
    .eq('client_id', clientId)

  if (error) throw new Error(`Failed to delete content: ${error.message}`)

  revalidatePath(`/sites/${client.slug}`)
  revalidatePath(`/clients/${clientId}/website`)
  return { success: true }
}

// ── Image Upload ─────────────────────────────────────────────

export async function uploadWebsiteImage(
  clientId: string,
  formData: FormData,
  type: 'logo' | 'hero' | 'favicon' | 'og_image' | 'owner_photo',
) {
  const { supabase, client } = await verifyClientAccess(clientId)

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${clientId}/${type}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('website-assets')
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const {
    data: { publicUrl },
  } = supabase.storage.from('website-assets').getPublicUrl(path)

  // Update the relevant URL field in website_config
  const urlField = {
    logo: 'logo_url',
    hero: 'hero_image_url',
    favicon: 'favicon_url',
    og_image: 'og_image_url',
    owner_photo: null, // stored in website_content about section, not config
  }[type]

  if (urlField) {
    await upsertWebsiteConfig(clientId, { [urlField]: publicUrl } as Record<string, string>)
  }

  revalidatePath(`/sites/${client.slug}`)
  revalidatePath(`/clients/${clientId}/website`)
  return { url: publicUrl }
}
