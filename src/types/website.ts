// Website product types — synced with supabase/migrations/007_website_config.sql + 001 website_content

import type { Client, KnowledgeEntry } from './domain'

export type TemplateId = 'bold' | 'clean' | 'classic'

export interface WebsiteConfig {
  id: string
  client_id: string
  template_id: TemplateId
  is_published: boolean
  // Branding
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  // Typography
  font_heading: string
  font_body: string
  // Assets
  logo_url: string | null
  favicon_url: string | null
  og_image_url: string | null
  hero_image_url: string | null
  // SEO
  meta_title: string | null
  meta_description: string | null
  // Analytics
  google_analytics_id: string | null
  created_at: string
  updated_at: string
}

export type WebsiteSection = 'hero' | 'services' | 'about' | 'testimonials' | 'hours' | 'contact'

export interface WebsiteContentBlock {
  id: string
  client_id: string
  section: WebsiteSection
  content: Record<string, unknown>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Typed content shapes per section

export interface HeroContent {
  headline?: string
  subheadline?: string
  cta_text?: string
  cta_phone?: boolean // true = link to tel:, false = scroll to contact
  background_image_url?: string
}

export interface AboutContent {
  text?: string
  owner_photo_url?: string
  mission_statement?: string
}

export interface TestimonialItem {
  name: string
  text: string
  rating: number // 1-5
  role?: string // e.g. "Regular Customer"
}

export interface TestimonialsContent {
  intro_text?: string
  items: TestimonialItem[]
}

export interface ServicesIntroContent {
  intro_text?: string
}

export interface ContactContent {
  map_embed_url?: string
  contact_form_enabled?: boolean
}

// Aggregate data passed to templates

export interface WebsiteData {
  client: Pick<
    Client,
    'id' | 'name' | 'slug' | 'phone_number' | 'business_hours' | 'address' | 'timezone' | 'owner_name'
  >
  config: WebsiteConfig
  knowledge: {
    services: Pick<KnowledgeEntry, 'title' | 'content'>[]
    pricing: Pick<KnowledgeEntry, 'title' | 'content'>[]
    faq: Pick<KnowledgeEntry, 'title' | 'content'>[]
    team: Pick<KnowledgeEntry, 'title' | 'content'>[]
    location: Pick<KnowledgeEntry, 'title' | 'content'>[]
  }
  sections: {
    hero?: HeroContent
    about?: AboutContent
    testimonials?: TestimonialsContent
    services_intro?: ServicesIntroContent
    contact?: ContactContent
  }
}

// Template component contract
export interface TemplateProps {
  data: WebsiteData
}

// Template metadata for the editor picker
export interface TemplateMeta {
  id: TemplateId
  name: string
  description: string
  preview_color: string // dominant color for preview card
}
