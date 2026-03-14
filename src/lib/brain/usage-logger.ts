// Usage Logger
// Tracks API cost per client per interaction

import { createServiceClient } from '@/lib/supabase/service'
import { MODEL_COSTS, COST_ALERT_THRESHOLD } from './constants'
import { reportError } from '@/lib/monitoring/report-error'
import type { Capability, TriggerType } from './types'

interface UsageData {
  clientId: string
  capability: Capability
  model: string
  inputTokens: number
  outputTokens: number
  triggerType: TriggerType
}

/**
 * Log a Claude API call's usage and estimated cost.
 * Fire-and-forget — never blocks the caller.
 */
export function logUsage(data: UsageData): void {
  void logUsageAsync(data)
}

async function logUsageAsync(data: UsageData): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Calculate estimated cost
    const costs = MODEL_COSTS[data.model as keyof typeof MODEL_COSTS]
    let estimatedCost = 0
    if (costs) {
      estimatedCost =
        (data.inputTokens / 1_000_000) * costs.input +
        (data.outputTokens / 1_000_000) * costs.output
    }

    await supabase.from('usage_log').insert({
      client_id: data.clientId,
      capability: data.capability,
      model: data.model,
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      estimated_cost: estimatedCost,
      trigger_type: data.triggerType,
    })

    // Check if client is exceeding monthly cost threshold
    await checkCostAlert(supabase, data.clientId)
  } catch (err) {
    console.error('[usage-logger] Failed to log usage:', err)
  }
}

async function checkCostAlert(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string,
): Promise<void> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('usage_log')
    .select('estimated_cost')
    .eq('client_id', clientId)
    .gte('created_at', startOfMonth.toISOString())

  if (!data) return

  let totalCost = 0
  for (const row of data) {
    totalCost += Number(row.estimated_cost) || 0
  }

  if (totalCost >= COST_ALERT_THRESHOLD) {
    reportError({
      type: 'lead_extraction', // reuse existing error type
      message: `Client API cost alert: $${totalCost.toFixed(2)}/month exceeds $${COST_ALERT_THRESHOLD} threshold`,
      clientId,
      context: { monthly_cost: totalCost, threshold: COST_ALERT_THRESHOLD },
    })
  }
}

/**
 * Get current month's usage summary for a client.
 */
export async function getMonthlyUsage(clientId: string): Promise<{
  totalCost: number
  byCapability: Record<string, number>
}> {
  const supabase = createServiceClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('usage_log')
    .select('capability, estimated_cost')
    .eq('client_id', clientId)
    .gte('created_at', startOfMonth.toISOString())

  let totalCost = 0
  const byCapability: Record<string, number> = {}

  for (const row of (data ?? [])) {
    const cost = Number(row.estimated_cost) || 0
    totalCost += cost
    byCapability[row.capability] = (byCapability[row.capability] ?? 0) + cost
  }

  return { totalCost, byCapability }
}
