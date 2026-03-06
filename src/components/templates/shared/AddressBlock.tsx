import { MapPin } from 'lucide-react'
import type { Address } from '@/types/domain'

interface AddressBlockProps {
  address: Address | null
  className?: string
}

export function AddressBlock({ address, className = '' }: AddressBlockProps) {
  if (!address) return null

  const mapsQuery = encodeURIComponent(
    `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-start gap-2 hover:underline ${className}`}
    >
      <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-[var(--site-primary)]" />
      <span>
        {address.street}
        <br />
        {address.city}, {address.state} {address.zip}
      </span>
    </a>
  )
}
