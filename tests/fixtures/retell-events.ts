import type {
  RetellCallStartedEvent,
  RetellCallEndedEvent,
  RetellCallAnalyzedEvent,
} from '@/types/retell'

export const MOCK_CALL_STARTED: RetellCallStartedEvent = {
  event: 'call_started',
  call: {
    call_id: 'call_test_123',
    agent_id: 'agent_test_456',
    direction: 'inbound',
    from_number: '+14235550001',
    to_number: '+14235559999',
    call_status: 'ongoing',
    call_type: 'phone_call',
    start_timestamp: 1709280000000,
  },
}

export const MOCK_CALL_ENDED: RetellCallEndedEvent = {
  event: 'call_ended',
  call: {
    ...MOCK_CALL_STARTED.call,
    call_status: 'ended',
    end_timestamp: 1709280180000,
    duration_ms: 180000,
    transcript:
      'Agent: Thanks for calling Interstate Tires, this is Sarah, how can I help you today?\nUser: Hi, I need a tire rotation and maybe an oil change.\nAgent: Sure, I can help with that. May I get your name?\nUser: John Smith.\nAgent: Great, John! When would you like to come in?',
    recording_url: 'https://storage.retellai.com/recordings/call_test_123.mp3',
  },
}

export const MOCK_CALL_ANALYZED: RetellCallAnalyzedEvent = {
  event: 'call_analyzed',
  call: {
    ...MOCK_CALL_ENDED.call,
    call_analysis: {
      call_summary: 'Customer called about tire rotation service',
      in_voicemail: false,
      user_sentiment: 'Positive',
      call_successful: true,
    },
  },
}

export const MOCK_CALL_WRONG_NUMBER: RetellCallEndedEvent = {
  event: 'call_ended',
  call: {
    call_id: 'call_wrong_number',
    agent_id: 'agent_test_456',
    direction: 'inbound',
    from_number: '+14235550002',
    to_number: '+14235559999',
    call_status: 'ended',
    call_type: 'phone_call',
    start_timestamp: 1709280000000,
    end_timestamp: 1709280005000,
    duration_ms: 5000,
    transcript: 'Agent: Thanks for calling Interstate Tires.\nUser: Oh sorry, wrong number.',
    recording_url: null as unknown as string,
  },
}

// Sunday 2024-03-03 at 11:30 PM UTC = Sunday 6:30 PM EST — this is WITHIN hours if close is 17:00
// Use a different timestamp: Monday 2024-03-04 at 03:00 AM UTC = Sunday 10:00 PM EST (after hours)
export const MOCK_CALL_AFTER_HOURS: RetellCallEndedEvent = {
  event: 'call_ended',
  call: {
    call_id: 'call_after_hours_123',
    agent_id: 'agent_test_456',
    direction: 'inbound',
    from_number: '+14235550003',
    to_number: '+14235559999',
    call_status: 'ended',
    call_type: 'phone_call',
    start_timestamp: 1709337000000,
    // Monday 2024-03-04 at 03:00 AM UTC = Sunday 2024-03-03 at 10:00 PM EST
    end_timestamp: 1709337000000,
    duration_ms: 5000,
    transcript: '',
    recording_url: null as unknown as string,
  },
}
