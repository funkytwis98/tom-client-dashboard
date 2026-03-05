'use client'

import { useState, useTransition } from 'react'
import { inviteClientOwner } from '@/app/actions/invitations'

interface Props {
  clientId: string
  ownerEmail: string | null
}

export function InviteOwnerButton({ clientId, ownerEmail }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState(ownerEmail ?? '')
  const [result, setResult] = useState<{ signupUrl?: string; error?: string } | null>(null)

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await inviteClientOwner(clientId, email)
      if ('error' in res) {
        setResult({ error: res.error ?? undefined })
      } else {
        setResult({ signupUrl: res.signupUrl })
      }
    })
  }

  if (result?.signupUrl) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm font-medium text-green-800 mb-2">Invitation created!</p>
        <p className="text-xs text-green-700 mb-2">Share this link with the business owner:</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={result.signupUrl}
            className="flex-1 text-xs bg-white border border-green-300 rounded px-2 py-1.5 font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(result.signupUrl!)}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
    )
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Invite Owner to Dashboard
      </button>
    )
  }

  return (
    <form onSubmit={handleInvite} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-600 mb-1">Owner email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="owner@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Sending...' : 'Send Invite'}
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
      {result?.error && (
        <p className="text-xs text-red-600">{result.error}</p>
      )}
    </form>
  )
}
