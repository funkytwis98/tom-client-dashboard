// Intent Classifier
// Routes SMS/text messages to the correct capability

import { TIER_CAPABILITIES } from './constants'
import type { Capability, IntentClassification, SubscriptionTier } from './types'

// Post approval patterns — exact matches or prefixes
const POST_APPROVAL_EXACT = new Set(['yes', 'no', 'approve', 'edit', 'reject'])
const POST_APPROVAL_PREFIX = ['change it to']

// Keyword-based routing patterns
const WEBSITE_KEYWORDS = /\b(website|visitors|traffic|clicks|site|page\s*views|analytics)\b/i
const SOCIAL_KEYWORDS = /\b(post|social|instagram|facebook|hashtag|content|draft)\b/i
const CALLS_KEYWORDS = /\b(call|caller|lead|phone|voicemail|missed\s+call)\b/i

/**
 * Classify an incoming SMS/text message to determine which capability should handle it.
 * Checks subscription tier gating and returns upsell message if gated.
 */
export function classifyIntent(
  message: string,
  clientTier: SubscriptionTier,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clientName?: string,
): IntentClassification {
  const trimmed = message.trim()
  const lower = trimmed.toLowerCase()

  // Determine capability from message content
  let capability: Capability = 'general_assistant'

  // Check post approval patterns first (exact match)
  if (POST_APPROVAL_EXACT.has(lower)) {
    capability = 'social_media'
  } else if (POST_APPROVAL_PREFIX.some(prefix => lower.startsWith(prefix))) {
    capability = 'social_media'
  } else if (WEBSITE_KEYWORDS.test(trimmed)) {
    capability = 'website_analyst'
  } else if (SOCIAL_KEYWORDS.test(trimmed)) {
    capability = 'social_media'
  } else if (CALLS_KEYWORDS.test(trimmed)) {
    capability = 'general_assistant' // scoped to calls data
  }
  // Everything else → general_assistant

  // Check if this capability is available for the client's tier
  const allowedCapabilities = TIER_CAPABILITIES[clientTier] ?? TIER_CAPABILITIES.free
  const isAllowed = allowedCapabilities.includes(capability)

  if (!isAllowed) {
    const upsellMap: Record<Capability, string> = {
      social_media: "That's part of the Social Media package! Want me to have Justin reach out about adding it?",
      website_analyst: "Website analytics is part of the Complete package! Want me to have Justin reach out about adding it?",
      receptionist: "Phone answering is part of the Receptionist package! Want me to have Justin reach out about it?",
      general_assistant: "I'd love to help with that! Want me to have Justin reach out about upgrading your plan?",
    }

    return {
      capability,
      gated: true,
      upsellMessage: upsellMap[capability],
    }
  }

  return { capability, gated: false }
}
