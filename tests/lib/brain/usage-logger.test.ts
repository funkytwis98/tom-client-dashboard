// Tests for logUsage and getMonthlyUsage — Usage Logger

// ── Supabase mock ──────────────────────────────────────────────────────────

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
}

jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockSupabase,
}))

const mockReportError = jest.fn()
jest.mock('@/lib/monitoring/report-error', () => ({
  reportError: mockReportError,
}))

// ── Tests ──────────────────────────────────────────────────────────────────

import { getMonthlyUsage } from '@/lib/brain/usage-logger'
import { MODEL_COSTS, COST_ALERT_THRESHOLD } from '@/lib/brain/constants'

const CLIENT_ID = 'test-client-001'

describe('logUsage (via logUsageAsync)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.gte.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockResolvedValue({ data: null, error: null })
  })

  it('calculates estimated_cost correctly for Haiku model', async () => {
    // logUsage is fire-and-forget, so we import the module and call it,
    // then flush promises to let the async work complete
    const { logUsage } = await import('@/lib/brain/usage-logger')

    // Mock the cost check query to return low cost (no alert)
    mockSupabase.gte.mockResolvedValueOnce({
      data: [{ estimated_cost: 0.001 }],
      error: null,
    })

    logUsage({
      clientId: CLIENT_ID,
      capability: 'receptionist',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      triggerType: 'phone_call',
    })

    // Flush microtasks
    await new Promise(r => setTimeout(r, 50))

    const haikuCosts = MODEL_COSTS['claude-haiku-4-5-20251001']
    const expectedCost =
      (1_000_000 / 1_000_000) * haikuCosts.input +
      (1_000_000 / 1_000_000) * haikuCosts.output

    expect(mockSupabase.from).toHaveBeenCalledWith('usage_log')
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        capability: 'receptionist',
        model: 'claude-haiku-4-5-20251001',
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        estimated_cost: expectedCost, // 0.25 + 1.25 = 1.50
        trigger_type: 'phone_call',
      }),
    )
  })

  it('calculates estimated_cost correctly for Sonnet model', async () => {
    const { logUsage } = await import('@/lib/brain/usage-logger')

    mockSupabase.gte.mockResolvedValueOnce({
      data: [{ estimated_cost: 0.001 }],
      error: null,
    })

    logUsage({
      clientId: CLIENT_ID,
      capability: 'social_media',
      model: 'claude-sonnet-4-5-20250514',
      inputTokens: 500_000,
      outputTokens: 100_000,
      triggerType: 'cron_task',
    })

    await new Promise(r => setTimeout(r, 50))

    const sonnetCosts = MODEL_COSTS['claude-sonnet-4-5-20250514']
    const expectedCost =
      (500_000 / 1_000_000) * sonnetCosts.input +
      (100_000 / 1_000_000) * sonnetCosts.output

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        estimated_cost: expectedCost, // 1.5 + 1.5 = 3.0
      }),
    )
  })

  it('sets estimated_cost to 0 for unknown model', async () => {
    const { logUsage } = await import('@/lib/brain/usage-logger')

    mockSupabase.gte.mockResolvedValueOnce({
      data: [{ estimated_cost: 0 }],
      error: null,
    })

    logUsage({
      clientId: CLIENT_ID,
      capability: 'general_assistant',
      model: 'some-unknown-model',
      inputTokens: 100,
      outputTokens: 100,
      triggerType: 'sms_response',
    })

    await new Promise(r => setTimeout(r, 50))

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        estimated_cost: 0,
      }),
    )
  })

  it('fires cost alert when monthly cost exceeds threshold', async () => {
    const { logUsage } = await import('@/lib/brain/usage-logger')

    // The insert succeeds
    mockSupabase.insert.mockResolvedValue({ data: null, error: null })

    // The checkCostAlert query returns costs exceeding threshold
    mockSupabase.gte.mockResolvedValueOnce({
      data: [
        { estimated_cost: COST_ALERT_THRESHOLD + 5 },
      ],
      error: null,
    })

    logUsage({
      clientId: CLIENT_ID,
      capability: 'receptionist',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: 1000,
      outputTokens: 1000,
      triggerType: 'phone_call',
    })

    await new Promise(r => setTimeout(r, 50))

    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('cost alert'),
        clientId: CLIENT_ID,
      }),
    )
  })
})

describe('getMonthlyUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
  })

  it('aggregates total cost across all entries', async () => {
    mockSupabase.gte.mockResolvedValueOnce({
      data: [
        { capability: 'receptionist', estimated_cost: 1.50 },
        { capability: 'social_media', estimated_cost: 3.00 },
        { capability: 'receptionist', estimated_cost: 0.75 },
      ],
      error: null,
    })

    const result = await getMonthlyUsage(CLIENT_ID)

    expect(result.totalCost).toBeCloseTo(5.25)
    expect(result.byCapability.receptionist).toBeCloseTo(2.25)
    expect(result.byCapability.social_media).toBeCloseTo(3.00)
  })

  it('returns zero totals when no usage data exists', async () => {
    mockSupabase.gte.mockResolvedValueOnce({ data: [], error: null })

    const result = await getMonthlyUsage(CLIENT_ID)

    expect(result.totalCost).toBe(0)
    expect(result.byCapability).toEqual({})
  })

  it('handles null data gracefully', async () => {
    mockSupabase.gte.mockResolvedValueOnce({ data: null, error: null })

    const result = await getMonthlyUsage(CLIENT_ID)

    expect(result.totalCost).toBe(0)
    expect(result.byCapability).toEqual({})
  })

  it('queries from start of current month', async () => {
    mockSupabase.gte.mockResolvedValueOnce({ data: [], error: null })

    await getMonthlyUsage(CLIENT_ID)

    expect(mockSupabase.from).toHaveBeenCalledWith('usage_log')
    expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', CLIENT_ID)
    // gte should be called with a date string starting with YYYY-MM-01
    const gteCall = mockSupabase.gte.mock.calls[0]
    expect(gteCall[0]).toBe('created_at')
    const dateStr = gteCall[1] as string
    // Should be start of current month
    const parsed = new Date(dateStr)
    expect(parsed.getDate()).toBe(1)
    expect(parsed.getHours()).toBe(0)
  })
})
