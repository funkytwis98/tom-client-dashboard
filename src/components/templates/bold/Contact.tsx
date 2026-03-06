import { BusinessHoursTable } from '../shared/BusinessHoursTable'
import { AddressBlock } from '../shared/AddressBlock'
import { CallNowButton } from '../shared/CallNowButton'
import type { TemplateProps } from '@/types/website'

export function BoldContact({ data }: TemplateProps) {
  const { client, sections } = data
  const contact = sections.contact

  return (
    <section className="py-20" id="contact">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-12 text-[var(--site-text)]">
          Get In Touch
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            {client.phone_number ? (
              <div>
                <h3 className="font-bold text-lg mb-3 text-[var(--site-text)]">Call Us</h3>
                <CallNowButton phone={client.phone_number} size="md" />
              </div>
            ) : null}
            {client.address ? (
              <div>
                <h3 className="font-bold text-lg mb-3 text-[var(--site-text)]">Visit Us</h3>
                <AddressBlock address={client.address} />
              </div>
            ) : null}
            {client.business_hours ? (
              <div>
                <h3 className="font-bold text-lg mb-3 text-[var(--site-text)]">Business Hours</h3>
                <BusinessHoursTable hours={client.business_hours} />
              </div>
            ) : null}
          </div>
          {contact?.map_embed_url ? (
            <div className="rounded-xl overflow-hidden shadow-lg h-80 lg:h-auto">
              <iframe
                src={contact.map_embed_url}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 320 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
