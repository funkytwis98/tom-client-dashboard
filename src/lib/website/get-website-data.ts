import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  WebsiteData,
  WebsiteContentBlock,
  HeroContent,
  AboutContent,
  TestimonialsContent,
  ServicesIntroContent,
  ContactContent,
  WebsiteSection,
} from '@/types/website'
import type { KnowledgeEntry } from '@/types/domain'

type KnowledgeCategory = 'services' | 'pricing' | 'faq' | 'team' | 'location'

const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = ['services', 'pricing', 'faq', 'team', 'location']

/**
 * Fetches all data needed to render a client's public website.
 * Uses service-role client (bypasses RLS) since this is for public pages.
 * Wrapped in React.cache() for per-request deduplication.
 */
export const getWebsiteData = cache(async (slug: string): Promise<WebsiteData | null> => {
  const supabase = createServiceClient()

  // Fetch client and config in parallel
  const clientPromise = supabase
    .from('clients')
    .select('id, name, slug, phone_number, business_hours, address, timezone, owner_name')
    .eq('slug', slug)
    .single()

  const configBySlugPromise = supabase
    .from('website_config')
    .select('*')
    .eq('is_published', true)

  const [{ data: client, error: clientError }, { data: allConfigs }] = await Promise.all([
    clientPromise,
    configBySlugPromise,
  ])

  if (clientError || !client) return null

  // Find the config for this client
  const config = allConfigs?.find((c) => c.client_id === client.id)
  if (!config) return null

  // Now fetch knowledge + content in parallel
  const [{ data: knowledge }, { data: contentBlocks }] = await Promise.all([
    supabase
      .from('knowledge_base')
      .select('category, title, content')
      .eq('client_id', client.id)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
    supabase
      .from('website_content')
      .select('*')
      .eq('client_id', client.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  // Group knowledge entries by category
  const grouped: Record<KnowledgeCategory, Pick<KnowledgeEntry, 'title' | 'content'>[]> = {
    services: [],
    pricing: [],
    faq: [],
    team: [],
    location: [],
  }
  for (const entry of knowledge ?? []) {
    const cat = entry.category as KnowledgeCategory
    if (KNOWLEDGE_CATEGORIES.includes(cat)) {
      grouped[cat].push({ title: entry.title, content: entry.content })
    }
  }

  // Parse content blocks into typed sections
  const sections: WebsiteData['sections'] = {}
  for (const block of (contentBlocks ?? []) as WebsiteContentBlock[]) {
    const section = block.section as WebsiteSection
    switch (section) {
      case 'hero':
        sections.hero = block.content as unknown as HeroContent
        break
      case 'about':
        sections.about = block.content as unknown as AboutContent
        break
      case 'testimonials':
        sections.testimonials = block.content as unknown as TestimonialsContent
        break
      case 'services':
        sections.services_intro = block.content as unknown as ServicesIntroContent
        break
      case 'contact':
        sections.contact = block.content as unknown as ContactContent
        break
    }
  }

  return {
    client,
    config: config as unknown as WebsiteData['config'],
    knowledge: grouped,
    sections,
  }
})
