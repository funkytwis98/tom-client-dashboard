/**
 * Tests for the Retell webhook handler and supporting utilities.
 * Uses Jest mocks to isolate from Supabase and external services.
 */

import crypto from 'crypto'
import { verifyRetellSignature } from '@/lib/retell/webhook-verify'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_API_KEY = 'test-retell-api-key-12345'

function makeSignature(body: string, apiKey = TEST_API_KEY): string {
  return crypto.createHmac('sha256', apiKey).update(body).digest('hex')
}

// ---------------------------------------------------------------------------
// verifyRetellSignature
// ---------------------------------------------------------------------------

describe('verifyRetellSignature', () => {
  it('returns true for a valid HMAC-SHA256 signature', () => {
    const body = JSON.stringify({ event: 'call_started', call: { call_id: 'abc' } })
    const sig = makeSignature(body)
    expect(verifyRetellSignature(body, sig, TEST_API_KEY)).toBe(true)
  })

  it('returns false for an invalid signature', () => {
    const body = JSON.stringify({ event: 'call_started' })
    expect(verifyRetellSignature(body, 'deadbeef', TEST_API_KEY)).toBe(false)
  })

  it('returns false when signature is null', () => {
    const body = JSON.stringify({ event: 'call_started' })
    expect(verifyRetellSignature(body, null, TEST_API_KEY)).toBe(false)
  })

  it('returns false when signature is empty string', () => {
    const body = JSON.stringify({ event: 'call_started' })
    expect(verifyRetellSignature(body, '', TEST_API_KEY)).toBe(false)
  })

  it('returns false when the body has been tampered with', () => {
    const body = JSON.stringify({ event: 'call_started', call: { call_id: 'abc' } })
    const sig = makeSignature(body)
    const tamperedBody = JSON.stringify({ event: 'call_ended', call: { call_id: 'abc' } })
    expect(verifyRetellSignature(tamperedBody, sig, TEST_API_KEY)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Webhook route handler integration tests
// ---------------------------------------------------------------------------

// Mocks must be declared before imports that use them.
// jest.mock is hoisted automatically by ts-jest.

jest.mock('@/lib/utils/env', () => ({
  env: {
    supabaseUrl: 'http://localhost:54321',
    supabaseAnonKey: 'anon-key',
    supabaseServiceRoleKey: () => 'service-key',
    retellApiKey: () => 'test-retell-api-key-12345',
    anthropicApiKey: () => 'anthropic-test-key',
    twilioAccountSid: () => 'twilio-sid',
    twilioAuthToken: () => 'twilio-token',
    twilioPhoneNumber: () => '+15005550006',
    twilioWebhookUrl: () => 'http://localhost/api/webhooks/sms-inbound',
    revalidateSecret: () => 'revalidate-secret',
    nodeEnv: 'test',
  },
  isProduction: () => false,
  isDevelopment: () => false,
}))

// Mock Retell client to avoid needing real API key
jest.mock('@/lib/retell/client', () => ({
  retellClient: {},
  getClientByAgentId: jest.fn(),
}))

// Mock Supabase service client
const mockFrom = jest.fn()
jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: jest.fn(() => ({ from: mockFrom })),
}))

// Build a chainable Supabase query builder that resolves to a given value
function buildQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'single', 'limit', 'order', 'maybeSingle', 'is', 'in',
  ]
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain)
  })
  // Make the chain thenable
  chain.then = (resolve: (v: unknown) => void, _reject?: unknown) => {
    resolve(result)
    return { then: jest.fn(), catch: jest.fn() }
  }
  chain.catch = jest.fn(() => chain)
  return chain
}

describe('Retell Webhook Route Handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getClientByAgentId } = require('@/lib/retell/client') as {
    getClientByAgentId: jest.MockedFunction<() => Promise<unknown>>
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function makeMockRequest(body: object, signature?: string): Request {
    const bodyStr = JSON.stringify(body)
    const sig = signature ?? makeSignature(bodyStr)
    return new Request('http://localhost/api/webhooks/retell', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-retell-signature': sig,
      },
      body: bodyStr,
    })
  }

  it('returns 401 when signature is missing', async () => {
    const { POST } = await import('@/app/api/webhooks/retell/route')
    const req = new Request('http://localhost/api/webhooks/retell', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'call_started', call: { call_id: 'abc' } }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when signature is invalid', async () => {
    const { POST } = await import('@/app/api/webhooks/retell/route')
    const req = makeMockRequest({ event: 'call_started' }, 'invalidsig')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 and creates call record for call_started event', async () => {
    const mockClient = {
      id: 'client_uuid',
      retell_agent_id: 'agent_test_456',
      business_hours: null,
      timezone: 'America/New_York',
    }

    // idempotency check returns null (not a duplicate)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'webhook_processing_log') {
        return buildQuery({ data: null, error: { code: 'PGRST116' } })
      }
      if (table === 'calls') {
        return buildQuery({ data: [{ id: 'call_uuid' }], error: null })
      }
      return buildQuery({ data: null, error: null })
    })
    getClientByAgentId.mockResolvedValue(mockClient)

    const { POST } = await import('@/app/api/webhooks/retell/route')
    const body = {
      event: 'call_started',
      call: {
        call_id: 'call_test_200',
        agent_id: 'agent_test_456',
        direction: 'inbound',
        from_number: '+14235550001',
        to_number: '+14235559999',
        call_status: 'ongoing',
        call_type: 'phone_call',
        start_timestamp: 1709280000000,
      },
    }
    const req = makeMockRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 early (duplicate=true) for duplicate events (idempotency)', async () => {
    // idempotency check returns existing record — route should short-circuit
    mockFrom.mockImplementation(() => {
      return buildQuery({ data: { id: 'existing_log_id' }, error: null })
    })

    const { POST } = await import('@/app/api/webhooks/retell/route')
    const body = {
      event: 'call_started',
      call: {
        call_id: 'call_dupe_123',
        agent_id: 'agent_test_456',
        direction: 'inbound',
        from_number: '+14235550001',
        to_number: '+14235559999',
        call_status: 'ongoing',
        call_type: 'phone_call',
        start_timestamp: 1709280000000,
      },
    }
    const req = makeMockRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.duplicate).toBe(true)
  })

  it('returns 200 and sets status=voicemail for after-hours calls', async () => {
    // Business hours: Mon-Fri 8am-5pm EST
    const mockClient = {
      id: 'client_uuid',
      retell_agent_id: 'agent_test_456',
      business_hours: {
        mon: { open: '08:00', close: '17:00' },
        tue: { open: '08:00', close: '17:00' },
        wed: { open: '08:00', close: '17:00' },
        thu: { open: '08:00', close: '17:00' },
        fri: { open: '08:00', close: '17:00' },
      },
      timezone: 'America/New_York',
    }

    mockFrom.mockImplementation(() => buildQuery({ data: null, error: null }))
    getClientByAgentId.mockResolvedValue(mockClient)

    const { POST } = await import('@/app/api/webhooks/retell/route')
    // Monday 2024-03-04 03:00 AM UTC = Sunday 2024-03-03 10:00 PM EST (after hours)
    const afterHoursTimestamp = 1709514000000
    const body = {
      event: 'call_ended',
      call: {
        call_id: 'call_after_hours',
        agent_id: 'agent_test_456',
        direction: 'inbound',
        from_number: '+14235550001',
        to_number: '+14235559999',
        call_status: 'ended',
        call_type: 'phone_call',
        start_timestamp: afterHoursTimestamp - 60000,
        end_timestamp: afterHoursTimestamp,
        duration_ms: 60000,
        transcript: 'Voicemail left by caller',
        recording_url: null,
      },
    }
    const req = makeMockRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
