// API request/response types

// From Claude analysis of call transcripts
export interface LeadAnalysis {
  is_lead: boolean
  caller_name: string | null
  service_interested: string | null
  notes: string | null
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  lead_score: number  // 1-10
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative'
  requires_callback: boolean
}

// Combined result from call_ended processing
export interface CallAnalysis extends LeadAnalysis {
  is_after_hours: boolean
  call_quality_score: number  // 1-10
}

// Parsed from owner SMS reply text
export interface OwnerCommand {
  action: 'contacted' | 'booked' | 'lost' | 'pause' | 'resume' | 'website' | 'unknown'
  raw: string
}

// Payload for triggering SMS notifications
export interface NotificationPayload {
  client_id: string
  call_id?: string
  lead_id?: string
  type: 'new_lead' | 'missed_call' | 'daily_summary' | 'urgent'
  recipient_phone: string
  lead_score?: number
  caller_name?: string
  caller_number?: string
  summary?: string
  service?: string
  is_after_hours?: boolean
}

// Daily summary data structure
export interface DailySummary {
  date: string
  total_calls: number
  new_leads: number
  booked: number
  avg_duration_seconds: number
  top_lead: {
    name: string | null
    service: string | null
    score: number
  } | null
}

// Analytics queries response
export interface AnalyticsData {
  calls_today: number
  calls_this_week: number
  leads_this_week: number
  avg_call_duration_seconds: number
  lead_conversion_rate: number  // booked / total leads
}
