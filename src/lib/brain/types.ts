// Brain Library types

export type Capability = 'receptionist' | 'social_media' | 'website_analyst' | 'general_assistant'

export type SubscriptionTier = 'free' | 'receptionist' | 'social' | 'complete' | 'the_works' | 'website'

export type KnowledgeType = 'fact' | 'behavior' | 'policy'

export type TriggerType = 'phone_call' | 'sms_response' | 'cron_task' | 'reflection' | 'learning_pass'

export type CallerSentiment = 'positive' | 'neutral' | 'frustrated' | 'angry'

export type ProposalStatus = 'pending' | 'approved' | 'dismissed'

export type ProposalType = 'knowledge_entry' | 'learned_insight' | 'operator_flag'

export interface BuildPromptContext {
  callerPhone?: string
  smsThread?: string[]
  additionalInstructions?: string
}

export interface BuildPromptResult {
  prompt: string
  model: string
  fallback: string
}

export interface CapabilityConfig {
  identity: string
  model: string
  fallback: string
}

export interface ContactRecord {
  id: string
  client_id: string
  phone: string
  name: string | null
  interaction_count: number
  last_interaction_at: string
  last_interaction_summary: string | null
  first_contact_at: string
  tags: string[]
}

export interface KnowledgeEntryWithType {
  id: string
  client_id: string
  category: string
  title: string
  content: string
  priority: number
  is_active: boolean
  type: KnowledgeType
  usage_count: number
  last_used_at: string | null
}

export interface LearnedMemoryEntry {
  id: string
  client_id: string
  label: string
  value: string
  confidence: number
  status: string
  created_at: string
  updated_at: string | null
}

export interface ReflectionData {
  client_id: string
  capability: Capability
  confidence_score: number
  knowledge_gaps: string[]
  knowledge_used: string[]
  caller_sentiment: CallerSentiment
  suggested_knowledge: string[]
  pattern_noticed: string | null
  interaction_summary: string
  trigger_type: TriggerType
}

export interface IntentClassification {
  capability: Capability
  gated: boolean
  upsellMessage?: string
}

export class GatedCapabilityError extends Error {
  public readonly capability: Capability
  public readonly upsellMessage: string

  constructor(capability: Capability, upsellMessage: string) {
    super(`Capability "${capability}" is gated for this subscription tier`)
    this.name = 'GatedCapabilityError'
    this.capability = capability
    this.upsellMessage = upsellMessage
  }
}
