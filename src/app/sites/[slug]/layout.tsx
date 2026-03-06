import type { Metadata } from 'next'
import { getWebsiteData } from '@/lib/website/get-website-data'
import { googleFontsUrl } from '@/lib/website/theme'
import { SiteThemeVars } from '@/components/templates/shared/SiteThemeVars'
import { JsonLd } from '@/components/templates/shared/JsonLd'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getWebsiteData(slug)

  if (!data) {
    return { title: 'Site Not Found' }
  }

  const title = data.config.meta_title ?? data.client.name
  const description =
    data.config.meta_description ?? `${data.client.name} — local business website`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(data.config.og_image_url ? { images: [{ url: data.config.og_image_url }] } : {}),
    },
    ...(data.config.favicon_url
      ? { icons: { icon: data.config.favicon_url } }
      : {}),
  }
}

export default async function SiteLayout({ children, params }: LayoutProps) {
  const { slug } = await params
  const data = await getWebsiteData(slug)

  if (!data) {
    return <>{children}</>
  }

  const fontsUrl = googleFontsUrl(data.config.font_heading, data.config.font_body)

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontsUrl} />
      <SiteThemeVars config={data.config} />
      <JsonLd data={data} />
      {children}
    </>
  )
}
