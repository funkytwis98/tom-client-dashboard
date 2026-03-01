/**
 * Tests for analyzeCallTranscript() — lead extraction using Claude API.
 * Mocks the Anthropic SDK to return predetermined JSON responses.
 */

import { analyzeCallTranscript } from '@/lib/analysis/lead-extraction'
import type { LeadAnalysis } from '@/types/api'

// Mock the env module so the Anthropic client can instantiate
jest.mock('@/lib/utils/env', () => ({
  env: {
    anthropicApiKey: () => 'test-anthropic-key',
    supabaseUrl: 'http://localhost:54321',
    supabaseAnonKey: 'anon-key',
    supabaseServiceRoleKey: () => 'service-key',
    retellApiKey: () => 'test-retell-key',
    twilioAccountSid: () => 'twilio-sid',
    twilioAuthToken: () => 'twilio-token',
    twilioPhoneNumber: () => '+15005550006',
    twilioWebhookUrl: () => 'http://localhost',
    revalidateSecret: () => 'secret',
    nodeEnv: 'test',
  },
  isProduction: () => false,
  isDevelopment: () => false,
}))

// ---------------------------------------------------------------------------
// Mock Anthropic SDK
// ---------------------------------------------------------------------------

const mockMessagesCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockMessagesCreate,
      },
    })),
  }
})

// Helper to build a mock Anthropic messages.create response
function mockAnthropicResponse(jsonContent: object) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: JSON.stringify(jsonContent),
      },
    ],
    model: 'claude-3-5-haiku-20241022',
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}

// ---------------------------------------------------------------------------
// Sample transcripts
// ---------------------------------------------------------------------------

const QUALIFIED_LEAD_TRANSCRIPT = `
Agent: Thanks for calling Interstate Tires, this is Sarah, how can I help you today?
User: Hi, my name is John Smith, I need a tire rotation and possibly new tires for my truck.
Agent: Great, John! I can definitely help with that. What's a good number to reach you?
User: Yes, +14235550001, and I'd like to come in this week if possible.
Agent: Perfect, we have slots available Thursday and Friday. Which works better?
User: Thursday works great.
`

const WRONG_NUMBER_TRANSCRIPT = `
Agent: Thanks for calling Interstate Tires, this is Sarah.
User: Oh sorry, wrong number.
`

const URGENT_TRANSCRIPT = `
Agent: Thanks for calling Interstate Tires.
User: I have a flat tire right now on the highway and need help ASAP. This is an emergency.
Agent: Oh no, let's get you sorted out immediately. What's your name and location?
User: Maria Gonzalez, I'm on I-75 near exit 1.
`

const INFORMATIONAL_TRANSCRIPT = `
Agent: Thanks for calling Interstate Tires.
User: Hi, what are your hours on Saturday?
Agent: We're open Saturday from 8 AM to 3 PM.
User: OK thank you, bye.
`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analyzeCallTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns LeadAnalysis with all required fields for a qualified lead', async () => {
    const mockAnalysis: LeadAnalysis = {
      is_lead: true,
      caller_name: 'John Smith',
      service_interested: 'tire rotation',
      notes: 'Caller wants tire rotation and possibly new tires for a truck',
      urgency: 'high',
      lead_score: 8,
      summary: 'John Smith called about tire rotation and new tires for his truck. Scheduled for Thursday.',
      sentiment: 'positive',
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(QUALIFIED_LEAD_TRANSCRIPT)

    expect(result).toMatchObject({
      is_lead: true,
      caller_name: 'John Smith',
      service_interested: 'tire rotation',
      urgency: 'high',
      lead_score: 8,
      sentiment: 'positive',
      requires_callback: false,
    })
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('returns is_lead=false and lead_score <= 3 for a wrong number transcript', async () => {
    const mockAnalysis: LeadAnalysis = {
      is_lead: false,
      caller_name: null,
      service_interested: null,
      notes: null,
      urgency: 'low',
      lead_score: 1,
      summary: 'Caller dialed the wrong number and hung up.',
      sentiment: 'neutral',
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(WRONG_NUMBER_TRANSCRIPT)

    expect(result.is_lead).toBe(false)
    expect(result.lead_score).toBeLessThanOrEqual(3)
  })

  it('detects urgency=urgent from emergency keywords in transcript', async () => {
    const mockAnalysis: LeadAnalysis = {
      is_lead: true,
      caller_name: 'Maria Gonzalez',
      service_interested: 'flat tire repair',
      notes: 'Caller has a flat on I-75 near exit 1, needs emergency assistance',
      urgency: 'urgent',
      lead_score: 10,
      summary: 'Maria Gonzalez has an emergency flat tire on I-75 and needs immediate help.',
      sentiment: 'negative',
      requires_callback: true,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(URGENT_TRANSCRIPT)

    expect(result.urgency).toBe('urgent')
    expect(result.lead_score).toBeGreaterThanOrEqual(9)
  })

  it('extracts caller_name from transcript when mentioned', async () => {
    const mockAnalysis: LeadAnalysis = {
      is_lead: true,
      caller_name: 'John Smith',
      service_interested: 'tire rotation',
      notes: null,
      urgency: 'high',
      lead_score: 8,
      summary: 'John Smith called for tire rotation.',
      sentiment: 'positive',
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(QUALIFIED_LEAD_TRANSCRIPT)

    expect(result.caller_name).toBe('John Smith')
  })

  it('returns caller_name=null when not mentioned in transcript', async () => {
    const mockAnalysis: LeadAnalysis = {
      is_lead: false,
      caller_name: null,
      service_interested: null,
      notes: null,
      urgency: 'low',
      lead_score: 2,
      summary: 'Caller inquired about hours only.',
      sentiment: 'neutral',
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(INFORMATIONAL_TRANSCRIPT)

    expect(result.caller_name).toBeNull()
  })

  it('clamps lead_score to integer 1-10 range even if Claude returns out-of-range value', async () => {
    const mockAnalysis = {
      is_lead: true,
      caller_name: null,
      service_interested: 'tire repair',
      notes: null,
      urgency: 'medium' as const,
      lead_score: 15, // out of range — should be clamped to 10
      summary: 'General tire inquiry.',
      sentiment: 'neutral' as const,
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(QUALIFIED_LEAD_TRANSCRIPT)

    expect(result.lead_score).toBe(10)
    expect(Number.isInteger(result.lead_score)).toBe(true)
  })

  it('clamps lead_score to minimum of 1 if Claude returns 0 or negative', async () => {
    const mockAnalysis = {
      is_lead: false,
      caller_name: null,
      service_interested: null,
      notes: null,
      urgency: 'low' as const,
      lead_score: 0, // should be clamped to 1
      summary: 'Silence on the line.',
      sentiment: 'neutral' as const,
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(WRONG_NUMBER_TRANSCRIPT)

    expect(result.lead_score).toBe(1)
    expect(Number.isInteger(result.lead_score)).toBe(true)
  })

  it('rounds fractional lead_score to nearest integer', async () => {
    const mockAnalysis = {
      is_lead: true,
      caller_name: 'Jane Doe',
      service_interested: 'alignment',
      notes: null,
      urgency: 'medium' as const,
      lead_score: 6.7, // should round to 7
      summary: 'Jane called about alignment.',
      sentiment: 'positive' as const,
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    const result = await analyzeCallTranscript(QUALIFIED_LEAD_TRANSCRIPT)

    expect(result.lead_score).toBe(7)
    expect(Number.isInteger(result.lead_score)).toBe(true)
  })

  it('throws when Claude returns invalid JSON', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'this is not json {{{' }],
      model: 'claude-3-5-haiku-20241022',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 10 },
    })

    await expect(analyzeCallTranscript(WRONG_NUMBER_TRANSCRIPT)).rejects.toThrow()
  })

  it('uses claude-3-5-haiku model (cost-efficient)', async () => {
    const mockAnalysis: LeadAnalysis = {
      is_lead: false,
      caller_name: null,
      service_interested: null,
      notes: null,
      urgency: 'low',
      lead_score: 1,
      summary: 'Wrong number.',
      sentiment: 'neutral',
      requires_callback: false,
    }

    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse(mockAnalysis))
    await analyzeCallTranscript(WRONG_NUMBER_TRANSCRIPT)

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-3-5-haiku-20241022',
      })
    )
  })
})
