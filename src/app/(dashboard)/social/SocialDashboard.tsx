'use client'

import { useState } from 'react'
import SocialSettingsForm from './SocialSettingsForm'
import ContentQueue from './ContentQueue'
import MyIdeas from './MyIdeas'
import PostHistory from './PostHistory'

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

export default function SocialDashboard({ clientId, initialSettings }: SocialDashboardProps) {
  const [tab, setTab] = useState<SubTab>('queue')

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
      {tab === 'queue' && <ContentQueue clientId={clientId} />}
      {tab === 'ideas' && <MyIdeas clientId={clientId} />}
      {tab === 'history' && <PostHistory clientId={clientId} />}
      {tab === 'settings' && (
        <SocialSettingsForm clientId={clientId} initialSettings={initialSettings} />
      )}
    </div>
  )
}
