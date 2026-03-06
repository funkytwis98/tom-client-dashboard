import { BusinessHoursTable } from '../shared/BusinessHoursTable'
import { AddressBlock } from '../shared/AddressBlock'
import { CallNowButton } from '../shared/CallNowButton'
import type { TemplateProps } from '@/types/website'

export function ClassicContact({ data }: TemplateProps) {
  const { client, sections } = data
  const contact = sections.contact

  return (
    <section className="py-20" id="contact">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12 text-[var(--site-text)]">
          Get In Touch
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {client.phone_number ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <h3 className="font-semibold mb-4 text-[var(--site-text)]">Call Us</h3>
              <CallNowButton phone={client.phone_number} size="sm" className="rounded-full" />
            </div>
          ) : null}
          {client.address ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <h3 className="font-semibold mb-4 text-[var(--site-text)]">Visit Us</h3>
              <AddressBlock address={client.address} className="justify-center" />
            </div>
          ) : null}
          {client.business_hours ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4 text-center text-[var(--site-text)]">Hours</h3>
              <BusinessHoursTable hours={client.business_hours} className="text-sm" />
            </div>
          ) : null}
        </div>
        {contact?.map_embed_url ? (
          <div className="mt-8 rounded-2xl overflow-hidden shadow-sm h-64">
            <iframe
              src={contact.map_embed_url}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
