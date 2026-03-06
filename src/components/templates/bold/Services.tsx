import { Wrench } from 'lucide-react'
import type { TemplateProps } from '@/types/website'

export function BoldServices({ data }: TemplateProps) {
  const { knowledge, sections } = data
  const services = knowledge.services

  if (services.length === 0) return null

  return (
    <section className="py-20 bg-gray-50" id="services">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4 text-[var(--site-text)]">
          Our Services
        </h2>
        {sections.services_intro?.intro_text ? (
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {sections.services_intro.intro_text}
          </p>
        ) : (
          <div className="mb-12" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-[var(--site-primary)] hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-[var(--site-primary)]/10 flex items-center justify-center mb-4">
                <Wrench className="h-6 w-6 text-[var(--site-primary)]" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[var(--site-text)]">{service.title}</h3>
              <p className="text-gray-600 leading-relaxed">{service.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
