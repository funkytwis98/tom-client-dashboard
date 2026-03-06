import { CallNowButton } from '../shared/CallNowButton'
import type { TemplateProps } from '@/types/website'

export function CleanHero({ data }: TemplateProps) {
  const { client, sections, config } = data
  const hero = sections.hero

  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
              style={{ color: 'var(--site-text)', fontFamily: `'${config.font_heading}', sans-serif` }}
            >
              {hero?.headline ?? client.name}
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {hero?.subheadline ?? 'Professional service for your home and business'}
            </p>
            {client.phone_number ? (
              <CallNowButton
                phone={client.phone_number}
                text={hero?.cta_text ?? 'Schedule a Call'}
                size="md"
              />
            ) : null}
          </div>
          {config.hero_image_url ? (
            <div className="flex justify-center">
              <img
                src={config.hero_image_url}
                alt={client.name}
                className="rounded-2xl shadow-xl max-h-[400px] object-cover w-full"
              />
            </div>
          ) : (
            <div className="hidden lg:block">
              <div className="w-full h-80 rounded-2xl bg-gradient-to-br from-[var(--site-primary)]/10 to-[var(--site-accent)]/10" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
