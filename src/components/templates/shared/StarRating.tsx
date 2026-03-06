import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  className?: string
}

export function StarRating({ rating, className = '' }: StarRatingProps) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < rating ? 'fill-[var(--site-secondary)] text-[var(--site-secondary)]' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}
