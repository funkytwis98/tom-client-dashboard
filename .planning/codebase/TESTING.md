# Testing Patterns

**Analysis Date:** 2026-03-07

## Test Framework

**Runner:**
- Jest 30.2.0
- Config: `jest.config.ts`
- Preset: `ts-jest` (TypeScript compilation via ts-jest 29.4.6)
- Environment: `node` (not jsdom -- no browser testing)

**Assertion Library:**
- Jest built-in `expect` matchers

**Run Commands:**
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
```

## Test File Organization

**Location:** Separate `tests/` directory mirroring `src/` structure (NOT co-located)

**Naming:** `{module}.test.ts` (always `.test.ts`, never `.spec.ts`)

**Structure:**
```
tests/
├── api/
│   └── webhooks/
│       └── retell.test.ts          # API route handler tests
├── fixtures/
│   └── retell-events.ts            # Shared mock data
└── lib/
    ├── analysis/
    │   ├── call-scoring.test.ts    # AI scoring tests
    │   └── lead-extraction.test.ts # AI extraction tests
    ├── navigation.test.ts          # Navigation config tests
    ├── notifications/
    │   ├── parser.test.ts          # Owner command parsing
    │   └── templates.test.ts       # SMS template formatting
    └── retell/
        └── agent-builder.test.ts   # Retell agent prompt tests
    └── route-guard.test.ts         # Route authorization tests
```

**Total test files:** 7 test files + 1 fixture file

## Test Structure

**Suite Organization:**
```typescript
// Typical test file structure:
// 1. JSDoc comment describing what's tested
// 2. Imports
// 3. jest.mock() declarations (hoisted by ts-jest)
// 4. Helper functions for mock building
// 5. Sample data / constants
// 6. describe() blocks grouped by function or behavior

/**
 * Tests for analyzeCallTranscript() -- lead extraction using Claude API.
 * Mocks the Anthropic SDK to return predetermined JSON responses.
 */
import { analyzeCallTranscript } from '@/lib/analysis/lead-extraction'

jest.mock('@/lib/utils/env', () => ({ ... }))
jest.mock('@anthropic-ai/sdk', () => ({ ... }))

const SAMPLE_TRANSCRIPT = `...`

describe('analyzeCallTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns LeadAnalysis with all required fields', async () => {
    mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse({...}))
    const result = await analyzeCallTranscript(SAMPLE_TRANSCRIPT)
    expect(result).toMatchObject({ is_lead: true, ... })
  })
})
```

**Patterns:**
- `beforeEach(() => jest.clearAllMocks())` in every describe block
- `it('describes expected behavior')` -- descriptive test names, not "should" prefix
- Dashed line separators between test sections (mirrors source code style)

## Mocking

**Framework:** Jest built-in mocking (`jest.mock`, `jest.fn()`)

**Pattern 1 -- Module-level `jest.mock()` with factory:**
```typescript
// Mock env module (required by almost every test)
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
```

**Pattern 2 -- Supabase chainable query mock:**
```typescript
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
  chain.then = (resolve: (v: unknown) => void) => {
    resolve(result)
    return { then: jest.fn(), catch: jest.fn() }
  }
  chain.catch = jest.fn(() => chain)
  return chain
}

const mockFrom = jest.fn()
jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: jest.fn(() => ({ from: mockFrom })),
}))

// Usage in test:
mockFrom.mockImplementation((table: string) => {
  if (table === 'calls') return buildQuery({ data: [...], error: null })
  return buildQuery({ data: null, error: null })
})
```

**Pattern 3 -- Anthropic SDK mock:**
```typescript
const mockMessagesCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}))

// Helper to build response:
function mockAnthropicResponse(jsonContent: object) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: JSON.stringify(jsonContent) }],
    model: 'claude-3-5-haiku-20241022',
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}
```

**Pattern 4 -- Dynamic import for route handlers (avoids mock hoisting issues):**
```typescript
it('returns 401 when signature is missing', async () => {
  const { POST } = await import('@/app/api/webhooks/retell/route')
  const req = new Request('http://localhost/api/webhooks/retell', { ... })
  const res = await POST(req)
  expect(res.status).toBe(401)
})
```

**What to Mock:**
- External SDKs: Anthropic, Retell, Twilio, Stripe
- Supabase client (both server and service)
- Environment variables (`@/lib/utils/env`)
- Console methods when testing warning output (`jest.spyOn(console, 'warn')`)

**What NOT to Mock:**
- Pure functions (parsers, formatters, validators) -- test directly
- Zod schemas -- test via the functions that use them
- Internal type definitions

## Fixtures and Factories

**Test Data:**
```typescript
// tests/fixtures/retell-events.ts -- typed mock objects matching API contracts
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

// Fixtures build on each other using spread:
export const MOCK_CALL_ENDED: RetellCallEndedEvent = {
  event: 'call_ended',
  call: {
    ...MOCK_CALL_STARTED.call,
    call_status: 'ended',
    end_timestamp: 1709280180000,
    duration_ms: 180000,
    transcript: '...',
    recording_url: 'https://...',
  },
}
```

**Helper factories in test files:**
```typescript
// Inline helper for building test payloads with defaults + overrides
function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    client_id: 'client-123',
    type: 'urgent',
    recipient_phone: '+14235550000',
    caller_name: 'John Smith',
    ...overrides,
  }
}
```

**Location:**
- Shared fixtures: `tests/fixtures/`
- Per-test helpers/factories: defined inline at top of each test file

## Coverage

**Requirements:** No coverage thresholds enforced. Coverage collection configured but no minimum gates.

**Configuration in `jest.config.ts`:**
```typescript
collectCoverageFrom: ['src/**/*.ts', 'src/**/*.tsx'],
```

**View Coverage:**
```bash
npx jest --coverage
```

## Test Types

**Unit Tests:**
- Primary test type in the codebase
- Test pure functions directly (parsers, formatters, validators, scorers)
- Test Anthropic SDK integration via mocked responses
- Test Supabase query behavior via chainable mock builders
- Files: `tests/lib/**/*.test.ts`

**Integration Tests:**
- API route handler tests that import the actual `POST`/`GET` handler
- Use dynamic imports to work with hoisted mocks
- Construct real `Request` objects and assert `Response` status/body
- Files: `tests/api/**/*.test.ts`

**E2E Tests:**
- Not used. No Playwright/Cypress setup.

## Common Patterns

**Async Testing:**
```typescript
it('returns LeadAnalysis for a qualified lead', async () => {
  mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse({...}))
  const result = await analyzeCallTranscript(TRANSCRIPT)
  expect(result).toMatchObject({ is_lead: true })
})
```

**Error Testing:**
```typescript
it('throws when Claude returns invalid JSON', async () => {
  mockMessagesCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: 'not json {{{' }],
    ...
  })
  await expect(analyzeCallTranscript(TRANSCRIPT)).rejects.toThrow()
})
```

**Boundary Value Testing:**
```typescript
// Clamp tests -- verify score stays within 1-10 range
it('clamps lead_score to 10 if Claude returns out-of-range value', async () => {
  mockMessagesCreate.mockResolvedValueOnce(mockAnthropicResponse({ lead_score: 15 }))
  const result = await analyzeCallTranscript(TRANSCRIPT)
  expect(result.lead_score).toBe(10)
  expect(Number.isInteger(result.lead_score)).toBe(true)
})
```

**SMS Template Testing:**
```typescript
// Assert message content AND length constraints
it('stays under 300 characters', () => {
  const msg = formatUrgentLeadSMS(makePayload())
  expect(msg.length).toBeLessThanOrEqual(300)
})

it('handles missing caller name gracefully', () => {
  const msg = formatUrgentLeadSMS(makePayload({ caller_name: undefined }))
  expect(msg).toBeTruthy()
  expect(msg.length).toBeGreaterThan(0)
})
```

**Table-driven tests (implicit):**
```typescript
// Parser tests cover every recognized command variant
describe('contacted action', () => {
  it('parses "call back"', () => {
    expect(parseOwnerCommand('call back')).toEqual({ action: 'contacted', raw: 'call back' })
  })
  it('parses "callback"', () => { ... })
  it('parses "CALL BACK" (case insensitive)', () => { ... })
  it('parses "call them"', () => { ... })
})
```

## What is Tested

| Area | Coverage | Files |
|------|----------|-------|
| Retell webhook handler | Auth, idempotency, call events | `tests/api/webhooks/retell.test.ts` |
| Lead extraction (Claude) | All response shapes, edge cases, clamping | `tests/lib/analysis/lead-extraction.test.ts` |
| Call quality scoring | Short calls, scoring, clamping, invalid responses | `tests/lib/analysis/call-scoring.test.ts` |
| Owner SMS command parsing | All recognized commands + unknown handling | `tests/lib/notifications/parser.test.ts` |
| SMS notification templates | Content, length limits, graceful null handling | `tests/lib/notifications/templates.test.ts` |
| Agent prompt building | Knowledge injection, category ordering, business hours | `tests/lib/retell/agent-builder.test.ts` |
| Navigation config | Product-gated nav items | `tests/lib/navigation.test.ts` |
| Route authorization | Role-based + product-based route guards | `tests/lib/route-guard.test.ts` |

## What is NOT Tested

- React components (no component tests, no React Testing Library)
- Server actions (`src/app/actions/*.ts`)
- Supabase RLS policies
- Stripe webhook handler
- Twilio SMS webhook handler
- Middleware auth flow
- Client-side interactivity

## Adding New Tests

**For a new library module at `src/lib/{domain}/{module}.ts`:**
1. Create `tests/lib/{domain}/{module}.test.ts`
2. Mock `@/lib/utils/env` with the standard env mock block
3. Mock any external SDKs with `jest.mock()`
4. Use `beforeEach(() => jest.clearAllMocks())`
5. Use `describe` blocks grouped by function name

**For a new API route at `src/app/api/{path}/route.ts`:**
1. Create `tests/api/{path}/{handler}.test.ts`
2. Set up all mocks before imports
3. Use `await import('@/app/api/{path}/route')` to get the handler
4. Build `Request` objects with correct headers
5. Assert on `Response` status and JSON body

---

*Testing analysis: 2026-03-07*
