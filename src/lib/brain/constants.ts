// Brain Library constants

import type { Capability, SubscriptionTier } from './types'

// Token budgets per layer
export const TOKEN_BUDGETS = {
  CORE_IDENTITY: 300,
  CAPABILITY: 500,
  GUARDRAILS: 300,
  CLIENT_KNOWLEDGE: 1500,
  INTERACTION_CONTEXT: 200,
  LEARNED_MEMORY: 400,
  TOTAL_TARGET: 3200,
  TOTAL_WARNING: 4000,
} as const

// Knowledge base limits
export const MAX_KNOWLEDGE_ENTRIES = 40
export const MAX_LEARNED_ENTRIES = 15
export const LEARNED_STALENESS_DAYS = 90

// Model mappings per capability
export const CAPABILITY_MODELS: Record<Capability, string> = {
  receptionist: 'claude-haiku-4-5-20251001',
  social_media: 'claude-sonnet-4-5-20250514',
  website_analyst: 'claude-haiku-4-5-20251001',
  general_assistant: 'claude-haiku-4-5-20251001',
}

// Intent classifier model
export const INTENT_CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001'

// Reflection / learning pass model
export const REFLECTION_MODEL = 'claude-sonnet-4-5-20250514'

// Capability gating by subscription tier
export const TIER_CAPABILITIES: Record<SubscriptionTier, Capability[]> = {
  free: ['receptionist', 'social_media', 'website_analyst', 'general_assistant'],
  receptionist: ['receptionist', 'general_assistant'],
  social: ['social_media', 'general_assistant'],
  complete: ['receptionist', 'social_media', 'website_analyst', 'general_assistant'],
  the_works: ['receptionist', 'social_media', 'website_analyst', 'general_assistant'],
  website: ['general_assistant'],
}

// Default task frequencies (minutes)
export const DEFAULT_TASK_FREQUENCIES: Record<string, number> = {
  social_post_draft: 720,       // 12 hours
  callback_check: 15,
  weekly_recap: 10080,          // 7 days
  weekly_learning: 10080,       // 7 days
  stale_memory_check: 10080,    // 7 days
}

// Tasks gated by tier — maps task_type to required capabilities
export const TASK_CAPABILITY_REQUIREMENTS: Record<string, Capability> = {
  social_post_draft: 'social_media',
  callback_check: 'receptionist',
  weekly_recap: 'general_assistant',
  weekly_learning: 'general_assistant',
  stale_memory_check: 'general_assistant',
}

// Cost estimation per 1M tokens
export const MODEL_COSTS = {
  'claude-haiku-4-5-20251001': { input: 0.25, output: 1.25 },
  'claude-sonnet-4-5-20250514': { input: 3, output: 15 },
} as const

// API cost alert threshold per client per month
export const COST_ALERT_THRESHOLD = 30
