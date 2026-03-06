import { notFound } from 'next/navigation'
import { getWebsiteData } from '@/lib/website/get-website-data'
import { TEMPLATES } from '@/components/templates/template-registry'
import type { TemplateId } from '@/types/website'

export const revalidate = 300

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params
  const data = await getWebsiteData(slug)

  if (!data) {
    notFound()
  }

  const Template = TEMPLATES[data.config.template_id as TemplateId] ?? TEMPLATES.bold

  return <Template data={data} />
}
