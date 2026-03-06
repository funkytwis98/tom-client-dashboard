import { Phone } from 'lucide-react'
import Image from 'next/image'

interface SiteHeaderProps {
  businessName: string
  phone: string | null
  logoUrl?: string | null
}

export function SiteHeader({ businessName, phone, logoUrl }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt={businessName} width={40} height={40} className="h-10 w-auto object-contain" />
          ) : null}
          <span className="font-bold text-lg text-[var(--site-text)]">{businessName}</span>
        </div>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--site-primary)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Call Now</span>
          </a>
        ) : null}
      </div>
    </header>
  )
}
