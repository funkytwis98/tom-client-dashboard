// Core domain types — must stay in sync with supabase/migrations/001_initial_schema.sql

export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface Client {
  id: string
  org_id: string
  name: string
  slug: string
  phone_number: string | null
  retell_agent_id: string | null
  owner_name: string | null
  owner_phone: string | null
  owner_email: string | null
  timezone: string
  business_hours: BusinessHours | null
  address: Address | null
  website_domain: string | null
  settings: ClientSettings
  subscription_tier: 'standard' | 'premium' | 'enterprise'
  subscription_status: 'active' | 'paused' | 'cancelled'
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  mon?: DayHours
  tue?: DayHours
  wed?: DayHours
  thu?: DayHours
  fri?: DayHours
  sat?: DayHours
  sun?: DayHours
}

export interface DayHours {
  open: string   // "08:00"
  close: string  // "17:00"
  closed?: boolean
}

export interface Address {
  street: string
  city: string
  state: string
  zip: string
}

export interface ClientSettings {
  notifications_paused?: boolean   // true = suppress all SMS notifications
  notification_threshold?: number  // min lead_score to trigger SMS (default 5)
  quiet_hours_start?: string       // "18:00" — no non-urgent SMS after this
  quiet_hours_end?: string         // "07:00"
  daily_summary_time?: string      // "17:00" — when to send daily summary
}

export interface KnowledgeEntry {
  id: string
  client_id: string
  category: 'services' | 'pricing' | 'faq' | 'hours' | 'policies' | 'location' | 'team' | 'promotions' | 'competitors'
  title: string
  content: string
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Call {
  id: string
  client_id: string
  retell_call_id: string
  direction: 'inbound' | 'outbound'
  caller_number: string | null
  caller_name: string | null
  status: 'in_progress' | 'completed' | 'missed' | 'voicemail' | 'transferred'
  duration_seconds: number | null
  transcript: string | null
  summary: string | null
  recording_url: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  lead_score: number | null
  call_metadata: Record<string, unknown>
  created_at: string
}

export interface Lead {
  id: string
  client_id: string
  call_id: string | null
  name: string | null
  phone: string | null
  email: string | null
  service_interested: string | null
  notes: string | null
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  status: 'new' | 'contacted' | 'booked' | 'completed' | 'lost'
  follow_up_at: string | null
  owner_notified: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  client_id: string
  call_id: string | null
  lead_id: string | null
  type: 'new_lead' | 'missed_call' | 'daily_summary' | 'follow_up' | 'urgent'
  channel: 'sms' | 'email' | 'push'
  recipient_phone: string | null
  message: string
  status: 'sent' | 'delivered' | 'failed'
  owner_response: string | null
  created_at: string
}

export interface AgentConfig {
  id: string
  client_id: string
  agent_name: string
  greeting: string | null
  personality: string | null
  sales_style: string | null
  escalation_rules: string | null
  voicemail_message: string | null
  voice_id: string | null
  language: string
  custom_instructions: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  client_id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  tags: string[]
  status: 'active' | 'inactive' | 'vip'
  source: 'manual' | 'auto_converted'
  converted_from_lead_id: string | null
  total_calls: number
  last_call_at: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  role: 'admin' | 'client_owner'
  org_id: string | null
  client_id: string | null
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface ClientInvitation {
  id: string
  client_id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export type PlaybookCategory = 'objection_handling' | 'upsell_trigger' | 'urgency_script' | 'closing_technique'

export interface SalesPlaybook {
  id: string
  client_id: string
  category: PlaybookCategory
  title: string
  trigger_phrase: string | null
  response_script: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

// Joined types for dashboard display
export interface CallWithLead extends Call {
  lead?: Lead
}

export interface LeadWithCall extends Lead {
  call?: Call
}

export interface CustomerWithCalls extends Customer {
  calls?: Call[]
  leads?: Lead[]
}
