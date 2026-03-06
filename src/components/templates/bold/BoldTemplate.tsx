import type { TemplateProps } from '@/types/website'
import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import { BoldHero } from './Hero'
import { BoldServices } from './Services'
import { BoldAbout } from './About'
import { BoldTestimonials } from './Testimonials'
import { BoldContact } from './Contact'

export function BoldTemplate({ data }: TemplateProps) {
  const { client, config } = data

  return (
    <div className="min-h-screen" style={{ fontFamily: `'${config.font_body}', sans-serif` }}>
      <SiteHeader
        businessName={client.name}
        phone={client.phone_number}
        logoUrl={config.logo_url}
      />
      <main>
        <BoldHero data={data} />
        <BoldServices data={data} />
        <BoldAbout data={data} />
        <BoldTestimonials data={data} />
        <BoldContact data={data} />
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
