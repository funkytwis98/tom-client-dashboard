'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
      <div className="w-full max-w-md px-4">
        <div className="bg-[#111113] rounded-xl border border-[#222] p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-[#FFD700]">Tom Agency</h1>
            <p className="text-sm text-[#777] mt-2">Sign in to your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-[#999]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#333] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/40 focus:border-[#FFD700]/50"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-[#999]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#333] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/40 focus:border-[#FFD700]/50"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFD700] text-[#09090B] py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#FFD700]/90 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:ring-offset-2 focus:ring-offset-[#111113] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-xs text-[#555] text-center">
            Contact your account manager for access.
          </p>
        </div>
      </div>
    </div>
  )
}
