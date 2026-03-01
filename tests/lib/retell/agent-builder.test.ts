/**
 * Unit tests for agent-builder.ts
 * Covers: AGNT-01 (prompt assembly), AGNT-02 (knowledge base injection), AGNT-03 (agent sync)
 */

// Mock Supabase service client
jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: jest.fn(),
}))

// Mock Retell client
jest.mock('@/lib/retell/client', () => ({
  retellClient: {
    agent: {
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    llm: {
      update: jest.fn(),
    },
  },
}))

import { buildAgentPrompt, updateRetellAgent } from '@/lib/retell/agent-builder'
import { createServiceClient } from '@/lib/supabase/service'
import { retellClient } from '@/lib/retell/client'

// --- Mock data ---

const mockClient = {
  id: 'client-123',
  name: 'Interstate Tires',
  owner_name: 'Bob',
  timezone: 'America/New_York',
  retell_agent_id: 'agent-abc123',
  business_hours: {
    mon: { open: '08:00', close: '17:00' },
    tue: { open: '08:00', close: '17:00' },
    wed: { open: '08:00', close: '17:00' },
    thu: { open: '08:00', close: '17:00' },
    fri: { open: '08:00', close: '17:00' },
    sat: { open: '09:00', close: '14:00' },
    sun: { closed: true },
  },
  agent_config: [
    {
      agent_name: 'Sarah',
      greeting: "Thanks for calling Interstate Tires, this is Sarah, how can I help you?",
      personality: 'friendly, professional, knowledgeable about tires',
      sales_style: 'consultative, not pushy',
      escalation_rules: 'If the caller is angry, say "Let me get the manager on the line for you."',
      voicemail_message: null,
      voice_id: 'voice-001',
      language: 'en-US',
      custom_instructions: null,
    },
  ],
}

const mockKnowledge = [
  {
    id: 'k1',
    client_id: 'client-123',
    category: 'services',
    title: 'Tire Installation',
    content: 'We install all major tire brands. Labor starts at $25/tire.',
    priority: 80,
    is_active: true,
  },
  {
    id: 'k2',
    client_id: 'client-123',
    category: 'services',
    title: 'Tire Rotation',
    content: 'Tire rotation every 5,000 miles. Only $20.',
    priority: 60,
    is_active: true,
  },
  {
    id: 'k3',
    client_id: 'client-123',
    category: 'pricing',
    title: 'Standard Pricing',
    content: 'Mounting: $25/tire. Balancing: $15/tire. Rotation: $20 flat.',
    priority: 70,
    is_active: true,
  },
  {
    id: 'k4',
    client_id: 'client-123',
    category: 'services',
    title: 'Inactive Service',
    content: 'This service is no longer offered.',
    priority: 50,
    is_active: false,  // Should be excluded from prompt
  },
]

// Build a Supabase mock that chains .from().select().eq().single() and .from().select().eq().eq().order()
// Simulates Supabase's server-side filtering: only returns active knowledge entries
function buildSupabaseMock(clientData: unknown, knowledgeData: unknown[]) {
  // Client query chain: .from('clients').select(...).eq('id', ...).single()
  const clientChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: clientData, error: null }),
  }

  // Filter active entries to simulate Supabase's .eq('is_active', true) server-side filter
  const activeKnowledge = knowledgeData.filter(
    (e) => (e as { is_active: boolean }).is_active === true
  )

  // Knowledge query chain: .from('knowledge_base').select('*').eq('client_id', ...).eq('is_active', true).order(...)
  const knowledgeChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: activeKnowledge, error: null }),
  }

  return jest.fn().mockImplementation((table: string) => {
    if (table === 'clients') return clientChain
    if (table === 'knowledge_base') return knowledgeChain
    return {}
  })
}

describe('buildAgentPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('includes agent_name and greeting in the prompt', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    expect(prompt).toContain('Sarah')
    expect(prompt).toContain("Thanks for calling Interstate Tires, this is Sarah, how can I help you?")
  })

  it('includes personality in the prompt', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    expect(prompt).toContain('friendly, professional, knowledgeable about tires')
  })

  it('includes escalation_rules in the prompt', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    expect(prompt).toContain('If the caller is angry, say "Let me get the manager on the line for you."')
  })

  it('groups knowledge by category — services section appears before pricing', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    const servicesIdx = prompt.indexOf('## Services')
    const pricingIdx = prompt.indexOf('## Pricing')

    expect(servicesIdx).toBeGreaterThan(-1)
    expect(pricingIdx).toBeGreaterThan(-1)
    expect(servicesIdx).toBeLessThan(pricingIdx)
  })

  it('orders entries by priority DESC within a category', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    // Tire Installation (priority 80) should appear before Tire Rotation (priority 60)
    const installationIdx = prompt.indexOf('Tire Installation')
    const rotationIdx = prompt.indexOf('Tire Rotation')

    expect(installationIdx).toBeGreaterThan(-1)
    expect(rotationIdx).toBeGreaterThan(-1)
    expect(installationIdx).toBeLessThan(rotationIdx)
  })

  it('excludes inactive entries from the prompt', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    expect(prompt).not.toContain('Inactive Service')
    expect(prompt).not.toContain('This service is no longer offered')
  })

  it('includes business_hours when present', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    expect(prompt).toContain('Business Hours')
    expect(prompt).toContain('Monday')
    expect(prompt).toContain('Sunday: Closed')
  })

  it('omits business_hours section when business_hours is null', async () => {
    const clientWithoutHours = { ...mockClient, business_hours: null }
    const mockFrom = buildSupabaseMock(clientWithoutHours, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    expect(prompt).not.toContain('Business Hours')
    expect(prompt).not.toContain('Monday:')
  })

  it('uses default escalation_rules when escalation_rules is null', async () => {
    const clientWithoutEscalation = {
      ...mockClient,
      agent_config: [{ ...mockClient.agent_config[0], escalation_rules: null }],
    }
    const mockFrom = buildSupabaseMock(clientWithoutEscalation, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const prompt = await buildAgentPrompt('client-123')

    expect(prompt).toContain('frustrated')
    expect(prompt).toContain('team call you right back')
  })

  it('throws when client is not found', async () => {
    const clientChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }
    const knowledgeChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'clients') return clientChain
      return knowledgeChain
    })
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    await expect(buildAgentPrompt('nonexistent-id')).rejects.toThrow('Client nonexistent-id not found')
  })
})

describe('updateRetellAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('logs warning and returns without error when retell_agent_id is null', async () => {
    const clientWithoutAgent = { ...mockClient, retell_agent_id: null }

    const clientChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: clientWithoutAgent, error: null }),
    }
    const knowledgeChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'clients') return clientChain
      return knowledgeChain
    })
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(updateRetellAgent('client-123')).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no retell_agent_id'))

    warnSpy.mockRestore()
  })

  it('calls retellClient.agent.retrieve and retellClient.llm.update when agent_id exists', async () => {
    const mockFrom = buildSupabaseMock(mockClient, mockKnowledge)
    ;(createServiceClient as jest.Mock).mockReturnValue({ from: mockFrom })

    const mockAgent = {
      response_engine: {
        type: 'retell-llm',
        llm_id: 'llm-xyz456',
      },
    }

    ;(retellClient.agent.retrieve as jest.Mock).mockResolvedValue(mockAgent)
    ;(retellClient.llm.update as jest.Mock).mockResolvedValue({})

    await updateRetellAgent('client-123')

    expect(retellClient.agent.retrieve).toHaveBeenCalledWith('agent-abc123')
    expect(retellClient.llm.update).toHaveBeenCalledWith(
      'llm-xyz456',
      expect.objectContaining({ general_prompt: expect.stringContaining('Sarah') })
    )
  })
})
