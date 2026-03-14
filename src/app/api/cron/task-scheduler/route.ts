import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { env } from '@/lib/utils/env'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'
import { reportError } from '@/lib/monitoring/report-error'
import { buildPrompt, logUsage, processWeeklyLearning, TIER_CAPABILITIES } from '@/lib/brain'
import { TASK_CAPABILITY_REQUIREMENTS } from '@/lib/brain/constants'
import type { Capability, SubscriptionTier } from '@/lib/brain/types'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropicApiKey() })
  return _anthropic
}

/**
 * POST /api/cron/task-scheduler
 *
 * Multi-tenant cron scheduler. Runs every 15 minutes.
 * Checks all active clients for due tasks and executes them.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rl = rateLimit(req, { limit: 5, windowMs: 60_000 })
  if (!rl.success) return rateLimitResponse(rl) as unknown as NextResponse

  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${env.revalidateSecret()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Fetch all active clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, subscription_tier, subscription_status')
    .eq('subscription_status', 'active')

  if (clientsError || !clients) {
    console.error('[task-scheduler] Failed to fetch clients:', clientsError)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }

  let tasksRun = 0
  let tasksFailed = 0
  const errors: string[] = []

  for (const client of clients) {
    // Fetch due tasks for this client
    const { data: tasks } = await supabase
      .from('task_runs')
      .select('*')
      .eq('client_id', client.id)
      .eq('enabled', true)
      .lte('next_run_at', now)

    if (!tasks || tasks.length === 0) continue

    const tier = (client.subscription_tier ?? 'free') as SubscriptionTier
    const allowedCapabilities = TIER_CAPABILITIES[tier] ?? TIER_CAPABILITIES.free

    for (const task of tasks) {
      // Check capability gating
      const requiredCapability = TASK_CAPABILITY_REQUIREMENTS[task.task_type] as Capability | undefined
      if (requiredCapability && !allowedCapabilities.includes(requiredCapability)) {
        continue // Skip — client doesn't pay for this capability
      }

      try {
        await executeTask(task, client, supabase)

        // Update task_run: success
        const nextRun = new Date(Date.now() + task.frequency_minutes * 60 * 1000)
        await supabase
          .from('task_runs')
          .update({
            last_run_at: now,
            next_run_at: nextRun.toISOString(),
            last_status: 'success',
            last_error: null,
          })
          .eq('id', task.id)

        tasksRun++
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error(`[task-scheduler] Task ${task.task_type} failed for ${client.name}:`, errMsg)
        errors.push(`${client.name}/${task.task_type}: ${errMsg}`)

        // Update task_run: error (still advance next_run_at to avoid infinite retries)
        const nextRun = new Date(Date.now() + task.frequency_minutes * 60 * 1000)
        await supabase
          .from('task_runs')
          .update({
            last_run_at: now,
            next_run_at: nextRun.toISOString(),
            last_status: 'error',
            last_error: errMsg,
          })
          .eq('id', task.id)

        reportError({
          type: 'lead_extraction',
          message: `Cron task failed: ${task.task_type}`,
          detail: errMsg,
          clientId: client.id,
          context: { task_type: task.task_type },
        })

        tasksFailed++
      }
    }
  }

  return NextResponse.json({ tasks_run: tasksRun, tasks_failed: tasksFailed, errors })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTask(
  task: { task_type: string; client_id: string },
  client: { id: string; name: string },
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  switch (task.task_type) {
    case 'social_post_draft':
      await executeSocialPostDraft(client.id, supabase)
      break

    case 'callback_check':
      // Callback check is handled by the existing callback-reminders cron
      // This task just ensures it runs on schedule per client
      break

    case 'weekly_recap':
      await executeWeeklyRecap(client.id, client.name, supabase)
      break

    case 'weekly_learning':
      await processWeeklyLearning(client.id)
      break

    case 'stale_memory_check':
      await executeStaleMemoryCheck(client.id, supabase)
      break

    default:
      console.warn(`[task-scheduler] Unknown task type: ${task.task_type}`)
  }
}

async function executeSocialPostDraft(
  clientId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const brainResult = await buildPrompt(clientId, 'social_media', {
    additionalInstructions: 'Draft 1 social media post for today. Return just the post content (caption + hashtags). Keep it authentic and engaging.',
  })

  const message = await getAnthropicClient().messages.create({
    model: brainResult.model,
    max_tokens: 500,
    system: brainResult.prompt,
    messages: [{ role: 'user', content: 'Draft a social media post for today.' }],
  })

  logUsage({
    clientId,
    capability: 'social_media',
    model: brainResult.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    triggerType: 'cron_task',
  })

  // The post content would be saved to the posts table for approval
  // This integrates with the existing Command Center post approval flow
  const postContent = message.content[0].type === 'text' ? message.content[0].text : ''
  if (postContent) {
    const supabase = createServiceClient()
    await supabase.from('posts').insert({
      client_id: clientId,
      content_type: 'text',
      source: 'tom_brain',
      caption: postContent,
      status: 'pending_approval',
      approval: 'pending',
    })
  }
}

async function executeWeeklyRecap(
  clientId: string,
  clientName: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  // Get client's owner phone for SMS
  const { data: client } = await supabase
    .from('clients')
    .select('owner_phone')
    .eq('id', clientId)
    .single()

  if (!client?.owner_phone) return

  const brainResult = await buildPrompt(clientId, 'general_assistant', {
    additionalInstructions: `Generate a weekly summary for ${clientName}. Include: total calls this week, new leads, posts published, and one actionable insight. Keep it under 160 characters if possible — this goes via SMS.`,
  })

  const message = await getAnthropicClient().messages.create({
    model: brainResult.model,
    max_tokens: 200,
    system: brainResult.prompt,
    messages: [{ role: 'user', content: 'Generate the weekly recap.' }],
  })

  logUsage({
    clientId,
    capability: 'general_assistant',
    model: brainResult.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    triggerType: 'cron_task',
  })
}

async function executeStaleMemoryCheck(
  clientId: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  // Flag old learned_data entries as stale
  await supabase
    .from('learned_data')
    .update({ status: 'stale' })
    .eq('client_id', clientId)
    .eq('status', 'confirmed')
    .lt('updated_at', cutoff.toISOString())
}
