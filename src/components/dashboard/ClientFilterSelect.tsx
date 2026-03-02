'use client'

import { useRouter } from 'next/navigation'

interface ClientFilterSelectProps {
  clients: { id: string; name: string }[]
  currentValue: string
  buildHref: (clientId: string) => string
}

export function ClientFilterSelect({
  clients,
  currentValue,
  buildHref,
}: ClientFilterSelectProps) {
  const router = useRouter()

  return (
    <select
      value={currentValue}
      onChange={(e) => router.push(buildHref(e.target.value))}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      <option value="all">All clients</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
