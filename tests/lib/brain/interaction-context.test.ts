// Tests for loadInteractionContext and upsertContact — Interaction Context

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
  single: jest.fn(),
}

jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockSupabase,
}))

// ── Tests ──────────────────────────────────────────────────────────────────

import { loadInteractionContext, upsertContact } from '@/lib/brain/interaction-context'

const CLIENT_ID = 'test-client-001'
const PHONE = '+16155551234'

describe('loadInteractionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
  })

  it('returns new-contact context when callerPhone is not provided', async () => {
    const result = await loadInteractionContext(CLIENT_ID)

    expect(result.contact).toBeNull()
    expect(result.contextText).toContain('new contact')
    // Should not call Supabase when no phone
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns new-caller context when contact is not found in DB', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

    const result = await loadInteractionContext(CLIENT_ID, PHONE)

    expect(result.contact).toBeNull()
    expect(result.contextText).toContain('new caller')
  })

  it('includes SMS thread in context for new callers', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

    const thread = ['Owner: Hi there!', 'Caller: What are your hours?']
    const result = await loadInteractionContext(CLIENT_ID, PHONE, thread)

    expect(result.contextText).toContain('Recent messages in this thread')
    expect(result.contextText).toContain('> Owner: Hi there!')
    expect(result.contextText).toContain('> Caller: What are your hours?')
  })

  it('returns returning-caller context with interaction count', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'contact-1',
        client_id: CLIENT_ID,
        phone: PHONE,
        name: 'Mike Smith',
        interaction_count: 3,
        last_interaction_at: '2026-03-01T10:00:00Z',
        last_interaction_summary: 'Asked about tire rotation pricing',
        first_contact_at: '2026-02-01T10:00:00Z',
        tags: ['repeat_customer'],
      },
      error: null,
    })

    const result = await loadInteractionContext(CLIENT_ID, PHONE)

    expect(result.contact).not.toBeNull()
    expect(result.contact!.name).toBe('Mike Smith')
    expect(result.contextText).toContain('contacted before')
    expect(result.contextText).toContain('Mike Smith')
    expect(result.contextText).toContain('4th interaction') // interaction_count + 1
    expect(result.contextText).toContain('tire rotation pricing')
    expect(result.contextText).toContain('repeat_customer')
  })

  it('includes SMS thread for returning callers', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'contact-2',
        client_id: CLIENT_ID,
        phone: PHONE,
        name: null,
        interaction_count: 1,
        last_interaction_at: '2026-03-01T10:00:00Z',
        last_interaction_summary: null,
        first_contact_at: '2026-02-01T10:00:00Z',
        tags: [],
      },
      error: null,
    })

    const thread = ['Hi', 'Hello']
    const result = await loadInteractionContext(CLIENT_ID, PHONE, thread)

    expect(result.contextText).toContain('Recent messages')
    expect(result.contextText).toContain('> Hi')
  })

  it('limits SMS thread to last 5 messages', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

    const thread = ['msg1', 'msg2', 'msg3', 'msg4', 'msg5', 'msg6', 'msg7']
    const result = await loadInteractionContext(CLIENT_ID, PHONE, thread)

    // Should only include last 5
    expect(result.contextText).not.toContain('> msg1')
    expect(result.contextText).not.toContain('> msg2')
    expect(result.contextText).toContain('> msg3')
    expect(result.contextText).toContain('> msg7')
  })
})

describe('upsertContact', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    // eq must always return mockSupabase for chaining (multiple .eq calls)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockResolvedValue({ data: null, error: null })
    mockSupabase.update.mockReturnValue(mockSupabase)
  })

  it('creates a new contact when none exists', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

    await upsertContact(CLIENT_ID, PHONE, {
      name: 'New Person',
      interactionSummary: 'First call about tires',
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('contacts')
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        phone: PHONE,
        name: 'New Person',
        interaction_count: 1,
        last_interaction_summary: 'First call about tires',
        tags: [],
      }),
    )
  })

  it('increments interaction_count for existing contact', async () => {
    // single() for the lookup query
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'contact-1', interaction_count: 1, tags: [] },
      error: null,
    })
    // The final .eq('id', existing.id) after .update() needs to resolve
    // We handle this by making eq always return mockSupabase, and the last
    // eq in the update chain is effectively a no-op for our test.
    // We need the update().eq() chain to resolve — mock eq to resolve on the
    // call that follows update
    let updateCalled = false
    mockSupabase.update.mockImplementation(() => {
      updateCalled = true
      return mockSupabase
    })
    mockSupabase.eq.mockImplementation(() => {
      if (updateCalled) {
        updateCalled = false
        return Promise.resolve({ data: null, error: null })
      }
      return mockSupabase
    })

    await upsertContact(CLIENT_ID, PHONE, {
      interactionSummary: 'Follow-up call',
    })

    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_count: 2,
        last_interaction_summary: 'Follow-up call',
      }),
    )
  })

  it('auto-tags repeat_customer after 3 interactions', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'contact-2', interaction_count: 2, tags: [] },
      error: null,
    })
    let updateCalled = false
    mockSupabase.update.mockImplementation(() => {
      updateCalled = true
      return mockSupabase
    })
    mockSupabase.eq.mockImplementation(() => {
      if (updateCalled) {
        updateCalled = false
        return Promise.resolve({ data: null, error: null })
      }
      return mockSupabase
    })

    await upsertContact(CLIENT_ID, PHONE, {})

    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_count: 3,
        tags: expect.arrayContaining(['repeat_customer']),
      }),
    )
  })

  it('does not duplicate repeat_customer tag', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'contact-3', interaction_count: 5, tags: ['repeat_customer'] },
      error: null,
    })
    let updateCalled = false
    mockSupabase.update.mockImplementation(() => {
      updateCalled = true
      return mockSupabase
    })
    mockSupabase.eq.mockImplementation(() => {
      if (updateCalled) {
        updateCalled = false
        return Promise.resolve({ data: null, error: null })
      }
      return mockSupabase
    })

    await upsertContact(CLIENT_ID, PHONE, {})

    const updateArg = mockSupabase.update.mock.calls[0][0]
    const repeatCount = updateArg.tags.filter((t: string) => t === 'repeat_customer').length
    expect(repeatCount).toBe(1)
  })

  it('adds needs_attention tag when confidence is low', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'contact-4', interaction_count: 0, tags: [] },
      error: null,
    })
    let updateCalled = false
    mockSupabase.update.mockImplementation(() => {
      updateCalled = true
      return mockSupabase
    })
    mockSupabase.eq.mockImplementation(() => {
      if (updateCalled) {
        updateCalled = false
        return Promise.resolve({ data: null, error: null })
      }
      return mockSupabase
    })

    await upsertContact(CLIENT_ID, PHONE, { confidenceScore: 2 })

    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.arrayContaining(['needs_attention']),
      }),
    )
  })

  it('sets name to null when not provided for new contacts', async () => {
    // eq must stay chainable for the lookup
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

    await upsertContact(CLIENT_ID, PHONE, {})

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: null,
      }),
    )
  })
})
