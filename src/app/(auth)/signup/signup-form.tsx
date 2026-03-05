'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validateInvitationToken, acceptInvitation } from '@/app/actions/invitations'

export default function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [clientName, setClientName] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }

    validateInvitationToken(token).then((result) => {
      if (result.valid) {
        setTokenValid(true)
        setEmail(result.email)
        setClientName(result.clientName)
      } else {
        setTokenValid(false)
      }
    })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Failed to create account')
      setLoading(false)
      return
    }

    const result = await acceptInvitation(token, data.user.id)

    if ('error' in result) {
      setError(result.error ?? 'Failed to accept invitation')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-sm text-gray-500 mb-6">
              This invitation link is invalid or has expired. Please contact your agency administrator for a new invitation.
            </p>
            <Link
              href="/login"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">Validating invitation...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
            {clientName && (
              <p className="text-sm text-gray-500 mt-1">
                You&apos;ve been invited to manage <span className="font-medium text-gray-700">{clientName}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Choose a password (min 6 characters)"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
