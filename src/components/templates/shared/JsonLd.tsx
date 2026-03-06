import type { WebsiteData } from '@/types/website'

interface JsonLdProps {
  data: WebsiteData
}

export function JsonLd({ data }: JsonLdProps) {
  const { client } = data

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: client.name,
  }

  if (client.phone_number) {
    schema.telephone = client.phone_number
  }

  if (client.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: client.address.street,
      addressLocality: client.address.city,
      addressRegion: client.address.state,
      postalCode: client.address.zip,
      addressCountry: 'US',
    }
  }

  if (client.business_hours) {
    const dayMap: Record<string, string> = {
      monday: 'Mo',
      tuesday: 'Tu',
      wednesday: 'We',
      thursday: 'Th',
      friday: 'Fr',
      saturday: 'Sa',
      sunday: 'Su',
    }
    const specs: string[] = []
    for (const [day, abbr] of Object.entries(dayMap)) {
      const hours = client.business_hours[day as keyof typeof client.business_hours]
      if (hours && !hours.closed) {
        specs.push(`${abbr} ${hours.open}-${hours.close}`)
      }
    }
    if (specs.length > 0) {
      schema.openingHours = specs
    }
  }

  // Safe: JSON.stringify produces valid JSON — standard pattern for JSON-LD in React
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
