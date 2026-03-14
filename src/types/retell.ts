// Retell AI webhook event types
// Source: https://docs.retellai.com/features/webhook

export interface RetellCallObject {
  call_id: string
  agent_id: string
  call_status: 'registered' | 'ongoing' | 'ended' | 'error'
  call_type: 'web_call' | 'phone_call'
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  start_timestamp?: number   // unix ms
  end_timestamp?: number     // unix ms
  duration_ms?: number
  transcript?: string
  transcript_object?: TranscriptSegment[]
  recording_url?: string
  public_log_url?: string
  end_call_after_silence_ms?: number
  disconnection_reason?: string
  metadata?: Record<string, unknown>
}

export interface TranscriptSegment {
  role: 'agent' | 'user'
  content: string
  words: Array<{
    word: string
    start: number
    end: number
  }>
}

export interface RetellCallStartedEvent {
  event: 'call_started'
  call: RetellCallObject
}

export interface RetellCallEndedEvent {
  event: 'call_ended'
  call: RetellCallObject & {
    end_timestamp: number
    duration_ms: number
    transcript: string
    recording_url: string | null
  }
}

export interface RetellCallAnalyzedEvent {
  event: 'call_analyzed'
  call: RetellCallObject & {
    call_analysis?: {
      call_summary?: string
      in_voicemail?: boolean
      user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
      call_successful?: boolean
      custom_analysis_data?: Record<string, unknown>
    }
  }
}

export type RetellWebhookEvent =
  | RetellCallStartedEvent
  | RetellCallEndedEvent
  | RetellCallAnalyzedEvent
