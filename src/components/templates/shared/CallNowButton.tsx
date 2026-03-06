import { Phone } from 'lucide-react'

interface CallNowButtonProps {
  phone: string
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function CallNowButton({
  phone,
  text = 'Call Now',
  className = '',
  size = 'md',
}: CallNowButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <a
      href={`tel:${phone}`}
      className={`inline-flex items-center gap-2 rounded-lg bg-[var(--site-primary)] text-white font-semibold
        hover:opacity-90 transition-opacity ${sizeClasses[size]} ${className}`}
    >
      <Phone className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
      {text}
    </a>
  )
}
