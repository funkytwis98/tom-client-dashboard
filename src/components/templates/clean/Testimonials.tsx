import { StarRating } from '../shared/StarRating'
import type { TemplateProps } from '@/types/website'

export function CleanTestimonials({ data }: TemplateProps) {
  const testimonials = data.sections.testimonials

  if (!testimonials?.items?.length) return null

  return (
    <section className="py-20" id="testimonials">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12 text-[var(--site-text)]">
          Customer Reviews
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.items.map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <StarRating rating={item.rating} className="mb-3" />
              <p className="text-gray-600 mb-4 leading-relaxed">&ldquo;{item.text}&rdquo;</p>
              <p className="font-semibold text-[var(--site-text)]">{item.name}</p>
              {item.role ? <p className="text-sm text-gray-400">{item.role}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
