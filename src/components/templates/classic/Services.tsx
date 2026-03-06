import type { TemplateProps } from '@/types/website'

export function ClassicServices({ data }: TemplateProps) {
  const { knowledge, sections } = data
  const services = knowledge.services

  if (services.length === 0) return null

  return (
    <section className="py-20 bg-[var(--site-primary)]/5" id="services">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-3 text-[var(--site-text)]">
          What We Offer
        </h2>
        {sections.services_intro?.intro_text ? (
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            {sections.services_intro.intro_text}
          </p>
        ) : (
          <div className="mb-12" />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--site-accent)]/15 flex items-center justify-center mb-4">
                <span className="text-[var(--site-accent)] font-bold text-lg">{i + 1}</span>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[var(--site-text)]">{service.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{service.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
