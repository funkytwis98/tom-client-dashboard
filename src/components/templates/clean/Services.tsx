import { CheckCircle } from 'lucide-react'
import type { TemplateProps } from '@/types/website'

export function CleanServices({ data }: TemplateProps) {
  const { knowledge, sections } = data
  const services = knowledge.services

  if (services.length === 0) return null

  return (
    <section className="py-20" id="services">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-3 text-[var(--site-text)]">
          Our Services
        </h2>
        {sections.services_intro?.intro_text ? (
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            {sections.services_intro.intro_text}
          </p>
        ) : (
          <div className="mb-12" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, i) => (
            <div
              key={i}
              className="flex gap-4 p-6 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <CheckCircle className="h-6 w-6 text-[var(--site-accent)] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-1 text-[var(--site-text)]">{service.title}</h3>
                <p className="text-gray-500 leading-relaxed">{service.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
