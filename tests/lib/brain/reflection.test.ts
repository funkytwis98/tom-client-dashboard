// Tests for writeReflection and processWeeklyLearning — Reflection Pipeline

// ── Supabase mock ──────────────────────────────────────────────────────────

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  in: jest.fn().mockResolvedValue({ data: null, error: null }),
}

jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockSupabase,
}))

jest.mock('@/lib/utils/env', () => ({
  env: {
    anthropicApiKey: () => 'test-key',
  },
}))

// ── Anthropic mock ─────────────────────────────────────────────────────────

const mockCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
})

// ── Tests ──────────────────────────────────────────────────────────────────

import { writeReflection, processWeeklyLearning } from '@/lib/brain/reflection'
import type { ReflectionData } from '@/lib/brain/types'

const CLIENT_ID = 'test-client-001'

const sampleReflection: ReflectionData = {
  client_id: CLIENT_ID,
  capability: 'receptionist',
  confidence_score: 4,
  knowledge_gaps: ['pricing for premium tires'],
  knowledge_used: ['business hours', 'tire services'],
  caller_sentiment: 'positive',
  suggested_knowledge: ['Add premium tire pricing to KB'],
  pattern_noticed: 'Multiple callers asking about premium tires',
  interaction_summary: 'Caller asked about premium tire pricing, I did not have the info.',
  trigger_type: 'phone_call',
}

describe('writeReflection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset chainable behavior
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockResolvedValue({ data: null, error: null })
  })

  it('inserts correct fields into brain_reflections', async () => {
    await writeReflection(sampleReflection)

    expect(mockSupabase.from).toHaveBeenCalledWith('brain_reflections')
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        capability: 'receptionist',
        confidence_score: 4,
        knowledge_gaps: ['pricing for premium tires'],
        knowledge_used: ['business hours', 'tire services'],
        caller_sentiment: 'positive',
        suggested_knowledge: ['Add premium tire pricing to KB'],
        pattern_noticed: 'Multiple callers asking about premium tires',
        interaction_summary: expect.stringContaining('premium tire pricing'),
        trigger_type: 'phone_call',
        processed: false,
      }),
    )
  })

  it('always sets processed to false', async () => {
    await writeReflection(sampleReflection)

    const insertArg = mockSupabase.insert.mock.calls[0][0]
    expect(insertArg.processed).toBe(false)
  })
})

describe('processWeeklyLearning', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset all chainable mocks
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.gte.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.not.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockResolvedValue({ data: null, error: null })
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.in.mockResolvedValue({ data: null, error: null })
  })

  it('returns 0 when no unprocessed reflections exist', async () => {
    // First .from('brain_reflections').select...limit → no data
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null })

    const count = await processWeeklyLearning(CLIENT_ID)
    expect(count).toBe(0)
  })

  it('sends reflections to Claude and inserts proposals', async () => {
    const reflections = [
      {
        id: 'ref-1',
        capability: 'receptionist',
        confidence_score: 3,
        knowledge_gaps: ['tire pricing'],
        suggested_knowledge: ['Add tire pricing'],
        pattern_noticed: 'Repeat question',
        interaction_summary: 'Asked about tires',
        caller_sentiment: 'neutral',
      },
    ]

    // reflections query
    mockSupabase.limit.mockResolvedValueOnce({ data: reflections, error: null })
    // dismissed hashes query (via .not then no more chaining → resolves from .not)
    mockSupabase.not.mockResolvedValueOnce({ data: [], error: null })

    // Claude response
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            {
              type: 'knowledge_entry',
              title: 'Tire Pricing',
              description: 'Add pricing for premium tires',
              knowledge_type: 'fact',
              hash: 'tire-pricing-001',
            },
          ]),
        },
      ],
    })

    const count = await processWeeklyLearning(CLIENT_ID)
    expect(count).toBe(1)

    // Verify proposal was inserted
    expect(mockSupabase.from).toHaveBeenCalledWith('learning_proposals')
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        proposal_type: 'knowledge_entry',
        title: 'Tire Pricing',
        status: 'pending',
        dismissed_hash: 'tire-pricing-001',
      }),
    )
  })

  it('marks reflections as processed after generating proposals', async () => {
    const reflections = [{ id: 'ref-1', capability: 'receptionist', confidence_score: 4, knowledge_gaps: [], suggested_knowledge: [], pattern_noticed: null, interaction_summary: 'Test', caller_sentiment: 'neutral' }]

    mockSupabase.limit.mockResolvedValueOnce({ data: reflections, error: null })
    mockSupabase.not.mockResolvedValueOnce({ data: [], error: null })

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '[]' }],
    })

    await processWeeklyLearning(CLIENT_ID)

    // Verify reflections marked as processed
    expect(mockSupabase.update).toHaveBeenCalledWith({ processed: true })
    expect(mockSupabase.in).toHaveBeenCalledWith('id', ['ref-1'])
  })

  it('filters out previously dismissed proposals by hash', async () => {
    const reflections = [{ id: 'ref-2', capability: 'receptionist', confidence_score: 3, knowledge_gaps: ['x'], suggested_knowledge: ['y'], pattern_noticed: null, interaction_summary: 'Z', caller_sentiment: 'neutral' }]

    mockSupabase.limit.mockResolvedValueOnce({ data: reflections, error: null })
    // Return a dismissed hash
    mockSupabase.not.mockResolvedValueOnce({
      data: [{ dismissed_hash: 'already-dismissed' }],
      error: null,
    })

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            { type: 'knowledge_entry', title: 'Old', description: 'Already dismissed', knowledge_type: 'fact', hash: 'already-dismissed' },
            { type: 'knowledge_entry', title: 'New', description: 'Fresh insight', knowledge_type: 'fact', hash: 'brand-new' },
          ]),
        },
      ],
    })

    const count = await processWeeklyLearning(CLIENT_ID)
    expect(count).toBe(1) // Only the new one
  })

  it('returns 0 when Claude response is not valid JSON', async () => {
    const reflections = [{ id: 'ref-3', capability: 'receptionist', confidence_score: 3, knowledge_gaps: [], suggested_knowledge: [], pattern_noticed: null, interaction_summary: 'Test', caller_sentiment: 'neutral' }]

    mockSupabase.limit.mockResolvedValueOnce({ data: reflections, error: null })
    mockSupabase.not.mockResolvedValueOnce({ data: [], error: null })

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'This is not valid JSON' }],
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const count = await processWeeklyLearning(CLIENT_ID)
    expect(count).toBe(0)
    consoleSpy.mockRestore()
  })
})
