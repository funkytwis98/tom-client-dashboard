import { createClient } from '@/lib/supabase/server'

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        connected
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {connected ? 'Connected' : 'Not configured'}
    </span>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const retellConfigured = !!process.env.RETELL_API_KEY
  const twilioConfigured =
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_PHONE_NUMBER
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Account and integration settings</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Account */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user?.email ?? '—'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">User ID</label>
              <p className="mt-1 text-xs text-gray-400 font-mono">{user?.id ?? '—'}</p>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Integrations</h2>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Retell AI</p>
                <p className="text-xs text-gray-500">Voice AI and telephony</p>
              </div>
              <StatusBadge connected={retellConfigured} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Twilio</p>
                <p className="text-xs text-gray-500">SMS notifications to owners</p>
              </div>
              <StatusBadge connected={twilioConfigured} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Stripe</p>
                <p className="text-xs text-gray-500">Subscription billing</p>
              </div>
              <StatusBadge connected={stripeConfigured} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Supabase</p>
                <p className="text-xs text-gray-500">Database and authentication</p>
              </div>
              <StatusBadge connected={true} />
            </div>
          </div>
        </section>

        {/* About */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">About</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>AI Phone Receptionist — Command Center</p>
            <p className="text-xs text-gray-400">
              B2B SaaS: AI-powered phone receptionist for small businesses
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
