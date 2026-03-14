// Tests for buildPrompt — Brain Library main assembler

import { GatedCapabilityError } from '@/lib/brain/types'

// ── Supabase mock ──────────────────────────────────────────────────────────

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
}

jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockSupabase,
}))

jest.mock('@/lib/monitoring/report-error', () => ({
  reportError: jest.fn(),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

const CLIENT_ID = 'test-client-001'

function makeClientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CLIENT_ID,
    name: 'Test Business',
    owner_name: 'Jane Doe',
    address: { street: '123 Main St', city: 'Nashville', state: 'TN', zip: '37201' },
    business_hours: { monday: { open: '9:00', close: '17:00' } },
    website_domain: 'testbiz.com',
    timezone: 'America/Chicago',
    subscription_tier: 'complete',
    guardrails: null,
    capability_overrides: null,
    ...overrides,
  }
}

function makeKnowledgeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'kb-1',
    client_id: CLIENT_ID,
    category: 'services',
    title: 'Oil Change',
    content: 'Full synthetic oil change $59.99',
    priority: 10,
    is_active: true,
    type: 'fact',
    usage_count: 5,
    last_used_at: null,
    ...overrides,
  }
}

/**
 * Configure mockSupabase.from() to route different tables to different results.
 */
function setupMockTables(opts: {
  client?: Record<string, unknown>
  knowledge?: Record<string, unknown>[]
  contacts?: Record<string, unknown> | null
  learned?: Record<string, unknown>[]
}) {
  const clientData = opts.client ?? makeClientRow()
  const kbData = opts.knowledge ?? [makeKnowledgeEntry()]
  const contactData = opts.contacts ?? null
  const learnedData = opts.learned ?? []

  // Track the current table so chained methods can resolve correctly
  let currentTable = ''

  mockSupabase.from.mockImplementation((table: string) => {
    currentTable = table
    return mockSupabase
  })

  // All chainable methods just return mockSupabase
  mockSupabase.select.mockReturnValue(mockSupabase)
  mockSupabase.eq.mockReturnValue(mockSupabase)
  mockSupabase.gte.mockReturnValue(mockSupabase)
  mockSupabase.order.mockReturnValue(mockSupabase)

  // limit resolves the KB query
  mockSupabase.limit.mockImplementation(() => {
    if (currentTable === 'knowledge_base') {
      return { data: kbData, error: null }
    }
    if (currentTable === 'learned_data') {
      return { data: learnedData, error: null }
    }
    return { data: [], error: null }
  })

  // single resolves the client & contacts queries
  mockSupabase.single.mockImplementation(() => {
    if (currentTable === 'clients') {
      return { data: clientData, error: null }
    }
    if (currentTable === 'contacts') {
      return { data: contactData, error: null }
    }
    return { data: null, error: null }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('assembles a prompt containing all core sections', async () => {
    setupMockTables({})

    const { buildPrompt } = await import('@/lib/brain/index')
    const result = await buildPrompt(CLIENT_ID, 'receptionist')

    // Core identity
    expect(result.prompt).toContain('## Who You Are')
    expect(result.prompt).toContain('You are Tom')

    // Capability identity
    expect(result.prompt).toContain("## What You're Doing Right Now")
    expect(result.prompt).toContain('answering the phone')

    // Guardrails
    expect(result.prompt).toContain('## Important Rules')
    expect(result.prompt).toContain('Never share the business owner')

    // Client knowledge
    expect(result.prompt).toContain('## The Business You Work For')
    expect(result.prompt).toContain('Test Business')

    // Facts from knowledge base
    expect(result.prompt).toContain('## Information You Know')
    expect(result.prompt).toContain('Oil Change')

    // Interaction context
    expect(result.prompt).toContain('## About This Conversation')
  })

  it('includes client guardrails when present', async () => {
    setupMockTables({
      client: makeClientRow({ guardrails: ['Never discuss competitor prices', 'Always upsell tires'] }),
    })

    const { buildPrompt } = await import('@/lib/brain/index')
    const result = await buildPrompt(CLIENT_ID, 'receptionist')

    expect(result.prompt).toContain('Never discuss competitor prices')
    expect(result.prompt).toContain('Always upsell tires')
  })

  it('includes capability overrides when present', async () => {
    setupMockTables({
      client: makeClientRow({
        capability_overrides: { receptionist: 'Always ask if they need a ride to the shop.' },
      }),
    })

    const { buildPrompt } = await import('@/lib/brain/index')
    const result = await buildPrompt(CLIENT_ID, 'receptionist')

    expect(result.prompt).toContain('## Special Instructions for This Business')
    expect(result.prompt).toContain('Always ask if they need a ride')
  })

  it('includes additionalInstructions from context', async () => {
    setupMockTables({})

    const { buildPrompt } = await import('@/lib/brain/index')
    const result = await buildPrompt(CLIENT_ID, 'receptionist', {
      additionalInstructions: 'The caller mentioned they are a returning customer.',
    })

    expect(result.prompt).toContain('## Additional Context')
    expect(result.prompt).toContain('returning customer')
  })

  it('returns correct model and fallback for each capability', async () => {
    setupMockTables({})

    const { buildPrompt } = await import('@/lib/brain/index')
    const result = await buildPrompt(CLIENT_ID, 'receptionist')

    expect(result.model).toBe('claude-haiku-4-5-20251001')
    expect(result.fallback).toContain('Thank you for calling')
  })

  it('throws GatedCapabilityError for tier-gated capabilities', async () => {
    // 'website' tier only allows general_assistant
    setupMockTables({
      client: makeClientRow({ subscription_tier: 'website' }),
    })

    const { buildPrompt } = await import('@/lib/brain/index')

    await expect(buildPrompt(CLIENT_ID, 'social_media')).rejects.toThrow(GatedCapabilityError)

    try {
      await buildPrompt(CLIENT_ID, 'social_media')
    } catch (err) {
      expect(err).toBeInstanceOf(GatedCapabilityError)
      expect((err as GatedCapabilityError).capability).toBe('social_media')
      expect((err as GatedCapabilityError).upsellMessage).toContain('Social Media package')
    }
  })

  it('fires reportError when token budget exceeds warning threshold', async () => {
    // Create a large knowledge base to exceed ~4000 token budget (4 chars/token → ~16000 chars)
    const largeEntries = Array.from({ length: 30 }, (_, i) =>
      makeKnowledgeEntry({
        id: `kb-${i}`,
        title: `Service ${i}`,
        content: 'A'.repeat(600), // 600 chars each → 18000 chars total
        type: 'fact',
      }),
    )

    setupMockTables({ knowledge: largeEntries })

    const { reportError } = await import('@/lib/monitoring/report-error')
    const { buildPrompt } = await import('@/lib/brain/index')

    await buildPrompt(CLIENT_ID, 'receptionist')

    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('token budget'),
        clientId: CLIENT_ID,
      }),
    )
  })
})
