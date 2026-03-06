import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-receptionist-snowy.vercel.app'

  const supabase = createServiceClient()

  const { data: configs } = await supabase
    .from('website_config')
    .select('client_id, updated_at')
    .eq('is_published', true)

  if (!configs?.length) {
    return [{ url: baseUrl, lastModified: new Date(), priority: 1 }]
  }

  // Get slugs for published clients
  const clientIds = configs.map((c) => c.client_id)
  const { data: clients } = await supabase
    .from('clients')
    .select('id, slug')
    .in('id', clientIds)

  const slugMap = new Map((clients ?? []).map((c) => [c.id, c.slug]))

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), priority: 1 },
  ]

  for (const config of configs) {
    const slug = slugMap.get(config.client_id)
    if (slug) {
      entries.push({
        url: `${baseUrl}/sites/${slug}`,
        lastModified: config.updated_at,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  return entries
}
