// Brain Library — Main Assembler
// buildPrompt(clientId, capability, context?) → { prompt, model, fallback }

import { CORE_IDENTITY } from './core-identity'
import { assembleGuardrails } from './guardrails'
import { loadClientKnowledge, formatClientInfo, formatKnowledgeEntries } from './client-knowledge'
import { loadInteractionContext } from './interaction-context'
import { loadLearnedMemory, formatLearnedMemory } from './learned-memory'
import { TIER_CAPABILITIES, TOKEN_BUDGETS, CAPABILITY_MODELS } from './constants'
import { FALLBACK_PROMPTS } from './fallbacks'
import { reportError } from '@/lib/monitoring/report-error'

import { receptionistConfig } from './capabilities/receptionist'
import { socialMediaConfig } from './capabilities/social-media'
import { websiteAnalystConfig } from './capabilities/website-analyst'
import { generalAssistantConfig } from './capabilities/general-assistant'

import type { Capability, BuildPromptContext, BuildPromptResult, SubscriptionTier, CapabilityConfig } from './types'
import { GatedCapabilityError } from './types'

const CAPABILITY_CONFIGS: Record<Capability, CapabilityConfig> = {
  receptionist: receptionistConfig,
  social_media: socialMediaConfig,
  website_analyst: websiteAnalystConfig,
  general_assistant: generalAssistantConfig,
}

/**
 * Assemble Tom's full prompt by stacking all brain layers.
 *
 * @throws {GatedCapabilityError} if the capability is not available for this client's tier
 */
export async function buildPrompt(
  clientId: string,
  capability: Capability,
  context?: BuildPromptContext,
): Promise<BuildPromptResult> {
  // 1. Load client data (needed for tier check)
  const knowledge = await loadClientKnowledge(clientId)
  const tier = knowledge.client.subscription_tier as SubscriptionTier

  // 2. Check subscription tier gating
  const allowed = TIER_CAPABILITIES[tier] ?? TIER_CAPABILITIES.free
  if (!allowed.includes(capability)) {
    const upsellMap: Record<Capability, string> = {
      social_media: "That's part of the Social Media package! Want me to have Justin reach out about adding it?",
      website_analyst: "Website analytics is part of the Complete package! Want me to have Justin reach out about adding it?",
      receptionist: "Phone answering is part of the Receptionist package! Want me to have Justin reach out about it?",
      general_assistant: "I'd love to help with that! Want me to have Justin reach out about upgrading your plan?",
    }
    throw new GatedCapabilityError(capability, upsellMap[capability])
  }

  // 3. Get capability config
  const capConfig = CAPABILITY_CONFIGS[capability]

  // 4. Load async data in parallel (interaction context + learned memory)
  const [interactionCtx, learnedEntries] = await Promise.all([
    loadInteractionContext(clientId, context?.callerPhone, context?.smsThread),
    loadLearnedMemory(clientId),
  ])

  // 5. Assemble prompt sections
  const sections: string[] = []

  // Layer 1 — Core Identity
  sections.push('## Who You Are')
  sections.push(CORE_IDENTITY)

  // Layer 2 — Capability
  sections.push('')
  sections.push('## What You\'re Doing Right Now')
  sections.push(capConfig.identity)

  // Layer 2.5 — Guardrails (universal + per-client + policy entries from KB)
  const policyTexts = knowledge.policies.map(p => `- ${p.title}: ${p.content}`)
  const guardrailsText = assembleGuardrails(knowledge.client.guardrails as string[] | null)
  sections.push('')
  sections.push('## Important Rules')
  sections.push(guardrailsText)
  if (policyTexts.length > 0) {
    sections.push('')
    sections.push('Business-specific policies:')
    sections.push(policyTexts.join('\n'))
  }

  // Layer 3 — Client Knowledge: Business info
  sections.push('')
  sections.push('## The Business You Work For')
  sections.push(formatClientInfo(knowledge.client))

  // Layer 3 — Client Knowledge: Facts
  if (knowledge.facts.length > 0) {
    sections.push('')
    sections.push('## Information You Know')
    sections.push(formatKnowledgeEntries(knowledge.facts))
  }

  // Layer 3 — Client Knowledge: Behaviors
  if (knowledge.behaviors.length > 0) {
    sections.push('')
    sections.push('## How to Handle Situations')
    sections.push(formatKnowledgeEntries(knowledge.behaviors))
  }

  // Layer 3.5 — Interaction Context
  sections.push('')
  sections.push('## About This Conversation')
  sections.push(interactionCtx.contextText)

  // Layer 4 — Learned Memory (omitted if empty)
  const learnedText = formatLearnedMemory(learnedEntries)
  if (learnedText) {
    sections.push('')
    sections.push('## What You\'ve Learned')
    sections.push(learnedText)
  }

  // Layer 5 — Capability overrides (if any)
  if (knowledge.client.capability_overrides) {
    const overrides = knowledge.client.capability_overrides as Record<string, string>
    const override = overrides[capability]
    if (override) {
      sections.push('')
      sections.push('## Special Instructions for This Business')
      sections.push(override)
    }
  }

  // Additional context (one-off instructions)
  if (context?.additionalInstructions) {
    sections.push('')
    sections.push('## Additional Context')
    sections.push(context.additionalInstructions)
  }

  const prompt = sections.join('\n')

  // 6. Check token count (rough estimate: ~4 chars per token)
  const estimatedTokens = Math.ceil(prompt.length / 4)
  if (estimatedTokens > TOKEN_BUDGETS.TOTAL_WARNING) {
    reportError({
      type: 'lead_extraction', // reuse existing error type for system_errors
      message: `Brain prompt exceeds ${TOKEN_BUDGETS.TOTAL_WARNING} token budget: ~${estimatedTokens} tokens`,
      clientId,
      context: { capability, estimated_tokens: estimatedTokens },
    })
  }

  return {
    prompt,
    model: CAPABILITY_MODELS[capability],
    fallback: FALLBACK_PROMPTS[capability],
  }
}

// Re-export key types and utilities
export { GatedCapabilityError } from './types'
export type { Capability, BuildPromptContext, BuildPromptResult } from './types'
export { classifyIntent } from './intent-classifier'
export { writeReflection, processWeeklyLearning } from './reflection'
export { upsertContact } from './interaction-context'
export { logUsage, getMonthlyUsage } from './usage-logger'
export { getReflectionInstructions } from './confidence'
export { CAPABILITY_MODELS, TIER_CAPABILITIES } from './constants'
