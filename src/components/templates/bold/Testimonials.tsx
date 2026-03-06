import { StarRating } from '../shared/StarRating'
import type { TemplateProps } from '@/types/website'

export function BoldTestimonials({ data }: TemplateProps) {
  const testimonials = data.sections.testimonials

  if (!testimonials?.items?.length) return null

  return (
    <section className="py-20 bg-gray-900 text-white" id="testimonials">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
          What Our Customers Say
        </h2>
        {testimonials.intro_text ? (
          <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
            {testimonials.intro_text}
          </p>
        ) : (
          <div className="mb-12" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.items.map((item, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6">
              <StarRating rating={item.rating} className="mb-4" />
              <p className="text-gray-200 mb-4 leading-relaxed">&ldquo;{item.text}&rdquo;</p>
              <div className="border-t border-gray-700 pt-4">
                <p className="font-semibold">{item.name}</p>
                {item.role ? <p className="text-sm text-gray-400">{item.role}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
