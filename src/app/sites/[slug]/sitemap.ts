import type { MetadataRoute } from 'next'
import { getWebsiteData } from '@/lib/website/get-website-data'

export default async function sitemap({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<MetadataRoute.Sitemap> {
  const { slug } = await params
  const data = await getWebsiteData(slug)

  if (!data) return []

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-receptionist-snowy.vercel.app'

  return [
    {
      url: `${baseUrl}/sites/${slug}`,
      lastModified: data.config.updated_at,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
