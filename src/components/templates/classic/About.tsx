import type { TemplateProps } from '@/types/website'

export function ClassicAbout({ data }: TemplateProps) {
  const { client, knowledge, sections } = data
  const about = sections.about
  const teamEntries = knowledge.team

  if (!about?.text && teamEntries.length === 0) return null

  return (
    <section className="py-20" id="about">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-8 text-[var(--site-text)]">
          About Us
        </h2>
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100">
          {about?.owner_photo_url ? (
            <div className="float-right ml-6 mb-4">
              <img
                src={about.owner_photo_url}
                alt={client.owner_name ?? 'Owner'}
                className="w-40 h-40 rounded-2xl object-cover shadow-sm"
              />
            </div>
          ) : null}
          {about?.text ? (
            <p className="text-gray-600 text-lg leading-relaxed mb-6">{about.text}</p>
          ) : null}
          {about?.mission_statement ? (
            <p className="text-[var(--site-primary)] font-medium italic text-lg mb-6">
              &ldquo;{about.mission_statement}&rdquo;
            </p>
          ) : null}
          {teamEntries.length > 0 ? (
            <div className="clear-both pt-6 border-t border-gray-100">
              <h3 className="font-bold text-lg mb-4 text-[var(--site-text)]">Meet the Team</h3>
              <div className="space-y-2">
                {teamEntries.map((member, i) => (
                  <div key={i} className="flex items-baseline gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--site-accent)] shrink-0 mt-2" />
                    <div>
                      <span className="font-semibold">{member.title}</span>
                      {member.content ? (
                        <span className="text-gray-500"> — {member.content}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
