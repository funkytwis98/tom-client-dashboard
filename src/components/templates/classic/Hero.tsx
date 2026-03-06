import { CallNowButton } from '../shared/CallNowButton'
import type { TemplateProps } from '@/types/website'

export function ClassicHero({ data }: TemplateProps) {
  const { client, sections, config } = data
  const hero = sections.hero

  return (
    <section className="py-20 sm:py-28 bg-[var(--site-bg)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {config.hero_image_url ? (
          <img
            src={config.hero_image_url}
            alt={client.name}
            className="w-full max-h-72 object-cover rounded-3xl shadow-md mb-10"
          />
        ) : null}
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-[var(--site-text)]"
          style={{ fontFamily: `'${config.font_heading}', serif` }}
        >
          {hero?.headline ?? `Welcome to ${client.name}`}
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          {hero?.subheadline ?? 'Your trusted local business'}
        </p>
        {client.phone_number ? (
          <CallNowButton
            phone={client.phone_number}
            text={hero?.cta_text ?? 'Give Us a Call'}
            size="lg"
            className="rounded-full"
          />
        ) : null}
      </div>
    </section>
  )
}
