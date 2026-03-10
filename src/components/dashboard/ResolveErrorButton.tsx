'use client'

import { useTransition } from 'react'
import { resolveSystemError } from '@/app/actions/monitoring'
import { useToast } from '@/components/dashboard/Toast'

export function ResolveErrorButton({ errorId }: { errorId: string }) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  return (
    <button
      onClick={() => startTransition(async () => {
        try {
          await resolveSystemError(errorId)
          showToast('Error resolved')
        } catch {
          showToast('Failed to resolve error', 'error')
        }
      })}
      disabled={isPending}
      className="shrink-0 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Resolving...' : 'Resolve'}
    </button>
  )
}
