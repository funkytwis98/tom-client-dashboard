import type { TemplateProps } from '@/types/website'

export function BoldAbout({ data }: TemplateProps) {
  const { client, knowledge, sections } = data
  const about = sections.about
  const teamEntries = knowledge.team

  if (!about?.text && teamEntries.length === 0) return null

  return (
    <section className="py-20" id="about">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 text-[var(--site-text)]">
              About {client.name}
            </h2>
            {about?.text ? (
              <p className="text-gray-600 text-lg leading-relaxed mb-6">{about.text}</p>
            ) : null}
            {about?.mission_statement ? (
              <blockquote className="border-l-4 border-[var(--site-primary)] pl-4 italic text-gray-700">
                {about.mission_statement}
              </blockquote>
            ) : null}
            {teamEntries.length > 0 ? (
              <div className="mt-8 space-y-3">
                <h3 className="font-bold text-lg text-[var(--site-text)]">Our Team</h3>
                {teamEntries.map((member, i) => (
                  <div key={i}>
                    <span className="font-semibold">{member.title}</span>
                    {member.content ? <span className="text-gray-600"> — {member.content}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {about?.owner_photo_url ? (
            <div className="flex justify-center">
              <img
                src={about.owner_photo_url}
                alt={`${client.owner_name ?? client.name} team`}
                className="rounded-2xl shadow-lg max-h-96 object-cover"
              />
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center">
              <div className="w-full h-80 rounded-2xl bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-accent)] opacity-20" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
