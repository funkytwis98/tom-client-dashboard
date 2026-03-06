import { BusinessHoursTable } from '../shared/BusinessHoursTable'
import { AddressBlock } from '../shared/AddressBlock'
import { CallNowButton } from '../shared/CallNowButton'
import type { TemplateProps } from '@/types/website'

export function CleanContact({ data }: TemplateProps) {
  const { client, sections } = data
  const contact = sections.contact

  return (
    <section className="py-20 bg-gray-50" id="contact">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12 text-[var(--site-text)]">Contact Us</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              {client.phone_number ? (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">
                    Phone
                  </h3>
                  <CallNowButton phone={client.phone_number} size="sm" />
                </div>
              ) : null}
              {client.address ? (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">
                    Address
                  </h3>
                  <AddressBlock address={client.address} />
                </div>
              ) : null}
            </div>
            {client.business_hours ? (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">
                  Hours
                </h3>
                <BusinessHoursTable hours={client.business_hours} />
              </div>
            ) : null}
          </div>
          {contact?.map_embed_url ? (
            <div className="mt-8 rounded-xl overflow-hidden h-64">
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
      </div>
    </section>
  )
}
