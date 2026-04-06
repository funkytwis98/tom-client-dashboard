'use client'

import { useState } from 'react'
import SocialSettingsForm from './SocialSettingsForm'

type SubTab = 'queue' | 'ideas' | 'history' | 'settings'

interface SocialSettings {
  id: string
  client_id: string
  platforms: string[]
  posting_frequency: string
  preferred_times: string[]
  tone: string | null
  topics_to_avoid: string | null
}

interface SocialDashboardProps {
  clientId: string
  initialSettings: SocialSettings | null
}

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'queue', label: 'Content Queue' },
  { key: 'ideas', label: 'My Ideas' },
  { key: 'history', label: 'Post History' },
  { key: 'settings', label: 'Settings' },
]

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <p className="text-3xl mb-3">{icon}</p>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
    </div>
  )
}

export default function SocialDashboard({ clientId, initialSettings }: SocialDashboardProps) {
  const [tab, setTab] = useState<SubTab>('settings')

  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Social Media</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your social media presence</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'queue' && (
        <EmptyState
          icon="📋"
          title="Coming soon"
          description="Your content queue will appear here. Tom will generate and schedule posts for your business automatically."
        />
      )}

      {tab === 'ideas' && (
        <EmptyState
          icon="💡"
          title="Coming soon"
          description="Your post ideas will appear here. Save ideas and Tom will turn them into polished content."
        />
      )}

      {tab === 'history' && (
        <EmptyState
          icon="📊"
          title="Coming soon"
          description="Your published post history and performance metrics will appear here."
        />
      )}

      {tab === 'settings' && (
        <SocialSettingsForm
          clientId={clientId}
          initialSettings={initialSettings}
        />
      )}
    </div>
  )
}
