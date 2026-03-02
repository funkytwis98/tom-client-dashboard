'use client'

import { useRouter } from 'next/navigation'

interface ClientFilterSelectProps {
  clients: { id: string; name: string }[]
  currentValue: string
  basePath: string
  currentParams: Record<string, string>
}

export function ClientFilterSelect({
  clients,
  currentValue,
  basePath,
  currentParams,
}: ClientFilterSelectProps) {
  const router = useRouter()

  function buildHref(clientId: string) {
    const sp = new URLSearchParams()
    const merged = { ...currentParams, client: clientId }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all') sp.set(k, v)
    }
    const qs = sp.toString()
    return `${basePath}${qs ? `?${qs}` : ''}`
  }

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
