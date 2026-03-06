import { CallNowButton } from '../shared/CallNowButton'
import type { TemplateProps } from '@/types/website'

export function BoldHero({ data }: TemplateProps) {
  const { client, sections, config } = data
  const hero = sections.hero

  return (
    <section
      className="relative min-h-[70vh] flex items-center justify-center text-white"
      style={{
        backgroundColor: 'var(--site-primary)',
        backgroundImage: config.hero_image_url
          ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${config.hero_image_url})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
          {hero?.headline ?? client.name}
        </h1>
        <p className="text-xl sm:text-2xl text-white/90 mb-10 max-w-2xl mx-auto">
          {hero?.subheadline ?? 'Quality service you can trust'}
        </p>
        {client.phone_number ? (
          <CallNowButton
            phone={client.phone_number}
            text={hero?.cta_text ?? 'Call Now'}
            size="lg"
            className="bg-[var(--site-secondary)] hover:bg-[var(--site-secondary)]/90"
          />
        ) : null}
      </div>
    </section>
  )
}
