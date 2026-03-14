import Link from 'next/link'

interface WelcomeBannerProps {
  clientName?: string | null
  agentName?: string
}

export function WelcomeBanner({ clientName, agentName = 'Your receptionist' }: WelcomeBannerProps) {
  return (
    <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Welcome{clientName ? `, ${clientName}` : ''}!
      </h2>
      <p className="text-sm text-gray-500 mb-4">Here&apos;s how to get started:</p>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">1</span>
          <div>
            <p className="text-sm font-medium text-gray-900">Add your business info</p>
            <p className="text-xs text-gray-500">
              Go to <Link href="/knowledge" className="text-gray-700 underline">Knowledge Base</Link> and add your services, hours, and FAQs so {agentName} knows your business.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">2</span>
          <div>
            <p className="text-sm font-medium text-gray-900">{agentName} starts answering calls</p>
            <p className="text-xs text-gray-500">Once connected, {agentName} will handle incoming calls 24/7 and capture lead details from each conversation.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">3</span>
          <div>
            <p className="text-sm font-medium text-gray-900">Check back here to see your leads</p>
            <p className="text-xs text-gray-500">
              Your <Link href="/calls" className="text-gray-700 underline">calls</Link>, <Link href="/leads" className="text-gray-700 underline">leads</Link>, and analytics will appear on this dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
