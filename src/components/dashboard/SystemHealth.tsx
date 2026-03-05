import { createClient } from '@/lib/supabase/server'
import { ResolveErrorButton } from './ResolveErrorButton'

interface SystemError {
  id: string
  error_type: string
  message: string
  created_at: string
}

export async function SystemHealth() {
  const supabase = await createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Query all three failure sources in parallel
  const [errorsResult, failedSmsResult, failedExtractionResult] = await Promise.all([
    supabase
      .from('system_errors')
      .select('id, error_type, message, created_at')
      .eq('resolved', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', since),
    supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .not('call_metadata->lead_extraction_error', 'is', null)
      .gte('created_at', since),
  ])

  const errors = (errorsResult.data ?? []) as SystemError[]
  const failedSmsCount = failedSmsResult.count ?? 0
  const failedExtractionCount = failedExtractionResult.count ?? 0

  const hasIssues = errors.length > 0 || failedSmsCount > 0 || failedExtractionCount > 0

  if (!hasIssues) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Summary counts */}
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <p className="text-sm font-medium text-red-800">System issues detected (last 24h)</p>
        </div>
        <div className="flex gap-4 text-xs text-red-700">
          {errors.length > 0 && (
            <span>{errors.length} unresolved error{errors.length !== 1 ? 's' : ''}</span>
          )}
          {failedSmsCount > 0 && (
            <span>{failedSmsCount} failed SMS notification{failedSmsCount !== 1 ? 's' : ''}</span>
          )}
          {failedExtractionCount > 0 && (
            <span>{failedExtractionCount} failed lead extraction{failedExtractionCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Individual error cards */}
      {errors.map((err) => (
        <div
          key={err.id}
          className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 flex items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-amber-800">{err.error_type}</p>
            <p className="text-xs text-amber-700 mt-0.5 truncate">{err.message}</p>
            <p className="text-xs text-amber-500 mt-0.5">
              {new Date(err.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <ResolveErrorButton errorId={err.id} />
        </div>
      ))}
    </div>
  )
}
