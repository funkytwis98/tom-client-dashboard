import { AddressBlock } from './AddressBlock'
import type { Address, BusinessHours } from '@/types/domain'

interface SiteFooterProps {
  businessName: string
  phone: string | null
  address: Address | null
  hours: BusinessHours | null
}

function getOpenDaysSummary(hours: BusinessHours): string {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const openDays: string[] = []
  for (const day of dayOrder) {
    const h = hours[day as keyof BusinessHours]
    if (h && !h.closed) openDays.push(day)
  }
  if (openDays.length === 0) return ''
  if (openDays.length === 7) return 'Open 7 Days'

  // Find first and last open day for a range summary
  const first = openDays[0].charAt(0).toUpperCase() + openDays[0].slice(1, 3)
  const last =
    openDays[openDays.length - 1].charAt(0).toUpperCase() +
    openDays[openDays.length - 1].slice(1, 3)
  return `${first} - ${last}`
}

export function SiteFooter({ businessName, phone, address, hours }: SiteFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">{businessName}</h3>
            {phone ? (
              <a href={`tel:${phone}`} className="hover:text-white transition-colors">
                {phone}
              </a>
            ) : null}
          </div>
          {address ? (
            <div>
              <h4 className="text-white font-semibold mb-3">Location</h4>
              <AddressBlock address={address} className="text-gray-300 hover:text-white" />
            </div>
          ) : null}
          {hours ? (
            <div>
              <h4 className="text-white font-semibold mb-3">Hours</h4>
              <p>{getOpenDaysSummary(hours)}</p>
            </div>
          ) : null}
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-sm text-gray-500 text-center">
          &copy; {year} {businessName}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
