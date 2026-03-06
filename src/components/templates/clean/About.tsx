import type { TemplateProps } from '@/types/website'

export function CleanAbout({ data }: TemplateProps) {
  const { client, knowledge, sections } = data
  const about = sections.about
  const teamEntries = knowledge.team

  if (!about?.text && teamEntries.length === 0) return null

  return (
    <section className="py-20 bg-gray-50" id="about">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold mb-6 text-[var(--site-text)]">About {client.name}</h2>
        {about?.text ? (
          <p className="text-gray-600 text-lg leading-relaxed mb-8 max-w-3xl mx-auto">
            {about.text}
          </p>
        ) : null}
        {about?.mission_statement ? (
          <p className="text-[var(--site-primary)] font-medium text-xl italic mb-8">
            &ldquo;{about.mission_statement}&rdquo;
          </p>
        ) : null}
        {teamEntries.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamEntries.map((member, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm text-left">
                <p className="font-semibold text-[var(--site-text)]">{member.title}</p>
                {member.content ? (
                  <p className="text-gray-500 text-sm mt-1">{member.content}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
