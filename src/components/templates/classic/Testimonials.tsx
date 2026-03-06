import { StarRating } from '../shared/StarRating'
import type { TemplateProps } from '@/types/website'

export function ClassicTestimonials({ data }: TemplateProps) {
  const testimonials = data.sections.testimonials

  if (!testimonials?.items?.length) return null

  return (
    <section className="py-20 bg-[var(--site-primary)]/5" id="testimonials">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12 text-[var(--site-text)]">
          Happy Customers
        </h2>
        <div className="space-y-6">
          {testimonials.items.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row gap-6 items-start"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--site-secondary)]/20 flex items-center justify-center shrink-0">
                <span className="text-[var(--site-secondary)] font-bold text-lg">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <StarRating rating={item.rating} className="mb-2" />
                <p className="text-gray-600 leading-relaxed mb-3">&ldquo;{item.text}&rdquo;</p>
                <p className="font-semibold text-[var(--site-text)]">
                  {item.name}
                  {item.role ? (
                    <span className="font-normal text-gray-400"> &middot; {item.role}</span>
                  ) : null}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
