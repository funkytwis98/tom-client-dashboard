import type { TemplateProps } from '@/types/website'
import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import { ClassicHero } from './Hero'
import { ClassicServices } from './Services'
import { ClassicAbout } from './About'
import { ClassicTestimonials } from './Testimonials'
import { ClassicContact } from './Contact'

export function ClassicTemplate({ data }: TemplateProps) {
  const { client, config } = data

  return (
    <div className="min-h-screen bg-[var(--site-bg)]" style={{ fontFamily: `'${config.font_body}', sans-serif` }}>
      <SiteHeader
        businessName={client.name}
        phone={client.phone_number}
        logoUrl={config.logo_url}
      />
      <main>
        <ClassicHero data={data} />
        <ClassicServices data={data} />
        <ClassicAbout data={data} />
        <ClassicTestimonials data={data} />
        <ClassicContact data={data} />
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
