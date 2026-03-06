import type { TemplateProps } from '@/types/website'
import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import { CleanHero } from './Hero'
import { CleanServices } from './Services'
import { CleanAbout } from './About'
import { CleanTestimonials } from './Testimonials'
import { CleanContact } from './Contact'

export function CleanTemplate({ data }: TemplateProps) {
  const { client, config } = data

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${config.font_body}', sans-serif` }}>
      <SiteHeader
        businessName={client.name}
        phone={client.phone_number}
        logoUrl={config.logo_url}
      />
      <main>
        <CleanHero data={data} />
        <CleanServices data={data} />
        <CleanAbout data={data} />
        <CleanTestimonials data={data} />
        <CleanContact data={data} />
      </main>
      <SiteFooter
        businessName={client.name}
        phone={client.phone_number}
        address={client.address}
        hours={client.business_hours}
      />
    </div>
  )
}
