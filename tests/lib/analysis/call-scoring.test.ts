/**
 * Tests for scoreCallQuality() — AI call quality scoring using Claude.
 */

import { scoreCallQuality } from '@/lib/analysis/call-scoring'

// Mock env module
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

function mockScoreResponse(score: string | number) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: String(score) }],
    model: 'claude-3-5-haiku-20241022',
    stop_reason: 'end_turn',
    usage: { input_tokens: 50, output_tokens: 5 },
  }
}

// ---------------------------------------------------------------------------
// Sample transcripts
// ---------------------------------------------------------------------------

const SUCCESSFUL_CALL_TRANSCRIPT = `
Agent: Thanks for calling Interstate Tires, this is Tom. How can I help you today?
User: Hi, I need a tire rotation.
Agent: I'd be happy to help with that. Can I get your name?
User: Mike Johnson.
Agent: Great, Mike. We have availability tomorrow at 2 PM or Thursday at 10 AM. Which works?
User: Tomorrow at 2 PM works perfectly.
Agent: Wonderful! I've got you down for Mike Johnson, tire rotation, tomorrow at 2 PM. Is there anything else?
User: No, that's all. Thanks!
Agent: Thank you, Mike! We'll see you tomorrow.
`

const POOR_CALL_TRANSCRIPT = `
Agent: Thanks for calling Interstate Tires. How can I help?
User: I need an oil change.
Agent: I can help with that. How can I help you today?
User: I said I need an oil change.
Agent: Of course. How can I assist you?
User: Never mind.
`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scoreCallQuality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns score 1-3 for very short calls (< 10000ms) without calling Claude', async () => {
    const score = await scoreCallQuality('Short call', 5000)
    expect(score).toBeLessThanOrEqual(3)
    expect(score).toBeGreaterThanOrEqual(1)
    // Claude should NOT be called for very short calls
    expect(mockMessagesCreate).not.toHaveBeenCalled()
  })

  it('returns integer score 7-10 for a successful call', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockScoreResponse(8))
    const score = await scoreCallQuality(SUCCESSFUL_CALL_TRANSCRIPT, 120000)

    expect(score).toBeGreaterThanOrEqual(7)
    expect(score).toBeLessThanOrEqual(10)
    expect(Number.isInteger(score)).toBe(true)
  })

  it('returns integer score 4-6 for a call with AI confusion', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockScoreResponse(4))
    const score = await scoreCallQuality(POOR_CALL_TRANSCRIPT, 60000)

    expect(score).toBeGreaterThanOrEqual(4)
    expect(score).toBeLessThanOrEqual(6)
    expect(Number.isInteger(score)).toBe(true)
  })

  it('score is always an integer between 1 and 10', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockScoreResponse(7))
    const score = await scoreCallQuality(SUCCESSFUL_CALL_TRANSCRIPT, 180000)

    expect(Number.isInteger(score)).toBe(true)
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(10)
  })

  it('clamps score to 10 if Claude returns a value above 10', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockScoreResponse(15))
    const score = await scoreCallQuality(SUCCESSFUL_CALL_TRANSCRIPT, 180000)

    expect(score).toBe(10)
  })

  it('clamps score to 1 if Claude returns a value below 1', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockScoreResponse(-5))
    const score = await scoreCallQuality(SUCCESSFUL_CALL_TRANSCRIPT, 180000)

    expect(score).toBe(1)
  })

  it('returns default score 5 if Claude returns non-numeric text', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockScoreResponse('excellent'))
    const score = await scoreCallQuality(SUCCESSFUL_CALL_TRANSCRIPT, 180000)

    expect(score).toBe(5)
    expect(Number.isInteger(score)).toBe(true)
  })

  it('uses claude-3-5-haiku model for cost efficiency', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockScoreResponse(8))
    await scoreCallQuality(SUCCESSFUL_CALL_TRANSCRIPT, 180000)

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-3-5-haiku-20241022',
      })
    )
  })
})
