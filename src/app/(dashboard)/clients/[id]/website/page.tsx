import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClient } from '@/app/actions/clients'
import { getWebsiteConfig, getWebsiteContentForClient } from '@/app/actions/website'
import { WebsiteEditor } from '@/components/dashboard/WebsiteEditor'
import type { HeroContent, AboutContent, TestimonialsContent } from '@/types/website'

interface Props {
  params: Promise<{ id: string }>
}

const TABS = [
  { label: 'Details', href: '' },
  { label: 'Calls', href: '/calls' },
  { label: 'Leads', href: '/leads' },
  { label: 'Customers', href: '/customers' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'Agent', href: '/agent' },
  { label: 'Playbook', href: '/playbook' },
  { label: 'Website', href: '/website' },
]

export default async function WebsitePage({ params }: Props) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  const [config, contentBlocks] = await Promise.all([
    getWebsiteConfig(id),
    getWebsiteContentForClient(id),
  ])

  // Extract typed content from blocks
  const heroBlock = contentBlocks.find((b) => b.section === 'hero')
  const aboutBlock = contentBlocks.find((b) => b.section === 'about')
  const testimonialsBlock = contentBlocks.find((b) => b.section === 'testimonials')

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${id}`} className="hover:text-gray-700">
          {client.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Website</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Build and manage the client&apos;s website
        </p>
      </div>

      {/* Sub-nav tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const isActive = tab.href === '/website'
            return (
              <Link
                key={tab.label}
                href={`/clients/${id}${tab.href}`}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <WebsiteEditor
        clientId={id}
        clientSlug={client.slug}
        initialConfig={config}
        initialHero={(heroBlock?.content as unknown as HeroContent) ?? null}
        initialAbout={(aboutBlock?.content as unknown as AboutContent) ?? null}
        initialTestimonials={(testimonialsBlock?.content as unknown as TestimonialsContent) ?? null}
      />
    </div>
  )
}
