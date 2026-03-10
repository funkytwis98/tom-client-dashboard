# Coding Conventions

**Analysis Date:** 2026-03-07

## Naming Patterns

**Files:**
- Route files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts` (Next.js App Router conventions)
- Server actions: `src/app/actions/{resource}.ts` (lowercase, singular noun: `clients.ts`, `leads.ts`, `billing.ts`)
- Library modules: `src/lib/{domain}/{function}.ts` (kebab-case: `agent-builder.ts`, `lead-extraction.ts`, `rate-limit.ts`)
- Components: PascalCase filenames (`OnboardingWizard.tsx`, `CallVolumeChart.tsx`, `EmptyState.tsx`)
- Types: `src/types/{scope}.ts` (lowercase: `domain.ts`, `api.ts`, `retell.ts`, `website.ts`)
- Tests: `tests/{mirror-of-src-path}/{module}.test.ts` (e.g., `tests/lib/analysis/lead-extraction.test.ts`)
- Fixtures: `tests/fixtures/{resource}-{purpose}.ts` (e.g., `retell-events.ts`)

**Functions:**
- Use `camelCase` for all functions and variables
- Server actions: verb + noun (`createNewClient`, `updateClient`, `onboardClient`, `getClients`)
- API route handlers: uppercase HTTP method (`POST`, `GET`) as exported `async function`
- Internal helpers: descriptive camelCase (`handleCallStarted`, `buildAgentPrompt`, `parseOwnerCommand`)
- Utility functions: verb-based (`requireEnv`, `optionalEnv`, `formatDuration`, `isAfterHours`)

**Variables:**
- Constants: `UPPER_SNAKE_CASE` for module-level constants (`DEDUP_MS`, `CLEANUP_INTERVAL_MS`, `ANALYSIS_PROMPT`, `TEST_API_KEY`)
- Zod schemas: `PascalCase` + `Schema` suffix (`NewClientSchema`, `UpdateClientSchema`, `OnboardSchema`)
- Inferred Zod types: `PascalCase` + `Input` suffix (`NewClientInput`, `UpdateClientInput`, `OnboardInput`)

**Types/Interfaces:**
- Use `interface` for domain entities and API contracts (not `type` aliases for objects)
- PascalCase for all types: `Client`, `Call`, `Lead`, `AgentConfig`, `LeadAnalysis`
- Joined/extended types: `{Entity}With{Relation}` (`CallWithLead`, `LeadWithCall`, `CustomerWithCalls`)
- Props interfaces: `{Component}Props` pattern, or inline when simple

## Code Style

**Formatting:**
- No explicit Prettier config detected; relies on ESLint + editor defaults
- Single quotes for strings in TypeScript
- No trailing semicolons (inconsistent -- some files use semicolons, most do not)
- 2-space indentation
- Trailing commas in multi-line constructs

**Linting:**
- ESLint with `next/core-web-vitals` and `next/typescript` presets
- Config at `.eslintrc.json`
- Run via `npm run lint` (calls `next lint`)

**TypeScript:**
- `strict: true` in `tsconfig.json`
- Target: `ES2017`
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. External packages (`next`, `react`, `@supabase/*`, `zod`, `twilio`)
2. Internal modules via path alias (`@/lib/*`, `@/components/*`, `@/types/*`)
3. Relative imports (rare, only within same directory)

**Path Aliases:**
- `@/*` -> `./src/*` (configured in `tsconfig.json` and `jest.config.ts`)

**Example from `src/app/api/webhooks/retell/route.ts`:**
```typescript
import { env } from '@/lib/utils/env'
import { verifyRetellSignature } from '@/lib/retell/webhook-verify'
import { getClientByAgentId } from '@/lib/retell/client'
import { createServiceClient } from '@/lib/supabase/service'
import { isAfterHours } from '@/lib/utils/time'
import { analyzeCallTranscript } from '@/lib/analysis/lead-extraction'
import { sendOwnerSMS, shouldSendNotification } from '@/lib/notifications/twilio'
import type { RetellWebhookEvent } from '@/types/retell'
import { reportError } from '@/lib/monitoring/report-error'
import type { NotificationPayload } from '@/types/api'
import type { ClientSettings } from '@/types/domain'
import { rateLimit, rateLimitResponse } from '@/lib/middleware/rate-limit'
```

**Type imports:** Use `import type` for type-only imports (`import type { Client } from '@/types/domain'`)

## Error Handling

**Server Actions Pattern:**
- Validate input with Zod `.parse()` at the top of each action
- Check auth via `supabase.auth.getUser()` immediately after
- Throw `new Error(message)` for fatal failures in simple actions
- Return `{ success: false, error: string }` result objects in complex multi-step actions (e.g., `onboardClient`)
- Non-fatal failures: log with `console.error` and continue (e.g., Stripe customer creation during onboarding)

**API Route Handlers:**
- Rate limit first, return `429` via `rateLimitResponse()`
- Verify signatures/auth, return `401` on failure
- Parse body, return `400` on invalid JSON
- Wrap handler logic in `try/catch`, return `500` on unhandled errors
- Log errors with `console.error('[context-tag] description:', err)` -- bracket-prefixed context tags

**Non-Fatal / Best-Effort Operations:**
- Use `try/catch` blocks that log and continue
- Pattern: "Non-fatal -- call is already logged, notification is best-effort"
- Example from webhook handler: lead extraction failure logs error, stores error in `call_metadata`, but still returns 200

**Central Error Reporting:**
- Use `reportError()` from `src/lib/monitoring/report-error.ts`
- Fire-and-forget pattern: `void reportErrorAsync(opts)` -- never blocks caller
- Persists to `system_errors` table + optional SMS alert to admin (production only, with 10-min dedup)
- Never throws -- wraps everything in `try/catch` as last resort

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- Always prefix log messages with a bracket tag: `[retell-webhook]`, `[onboard]`, `[reportError]`
- Use `console.error` for errors, `console.warn` for warnings
- Include relevant context: `console.error('[retell-webhook] Handler error:', err)`

## Comments

**When to Comment:**
- Block comments with dashed separators for major sections within files
- JSDoc-style comments for exported functions with `@throws` annotations
- Inline comments for non-obvious business logic (e.g., "Non-fatal -- client is created, Stripe customer can be added later")
- Step-numbered comments for multi-step operations (e.g., "// 1. Insert client", "// 2. Create Stripe customer")

**Section Separators:**
```typescript
// ---------------------------------------------------------------------------
// Section Name
// ---------------------------------------------------------------------------
```

## Function Design

**Size:** Functions range from small utilities (5-10 lines) to complex handlers (50-80 lines). No strict limit enforced.

**Parameters:**
- Use Zod schemas for validated input on server actions
- Use typed interfaces for internal function parameters
- Optional parameters use `?` or `| undefined`, not default values

**Return Values:**
- Server actions return `{ success: boolean; ... }` objects or throw
- API routes return `Response.json({ ... }, { status: N })`
- Library functions return typed values directly, throw on failure

## Module Design

**Exports:**
- Named exports preferred (`export function`, `export async function`)
- Default exports only for Next.js page/layout components (`export default async function DashboardPage`)
- Zod inferred types exported alongside schemas: `export type NewClientInput = z.infer<typeof NewClientSchema>`

**Barrel Files:** Not used. Import directly from source files.

## Component Conventions

**Server vs Client Components:**
- Pages (`page.tsx`) are async Server Components by default -- fetch data directly
- Client Components marked with `'use client'` directive at top of file
- Client Components used for: forms, interactive UI, context providers, `useState`/`useEffect`

**Component Structure:**
- Props interfaces defined inline or above the component
- Helper functions (formatting, badge rendering) defined as module-level functions in the same file
- Empty states use the reusable `EmptyState` component from `src/components/dashboard/EmptyState.tsx`
- Loading states use skeleton UI with `animate-pulse` class

**Styling:**
- Tailwind CSS exclusively (no CSS modules, no styled-components)
- Responsive: mobile-first with `md:` and `lg:` breakpoints
- Color palette: gray-based UI with semantic colors for badges (green=positive, red=negative, yellow=warning)
- Brand colors defined in `tailwind.config.ts` under `gold` scale (#FFD700 as gold-500)

**Context/Providers:**
- Use React Context for cross-component state (`ToastContext`)
- Provider pattern with custom hook (`useToast()`)

## Environment Variable Access

**Pattern:** All env vars accessed through `src/lib/utils/env.ts`:
- Lazy accessors (functions) to avoid build-time throws: `env.retellApiKey()`
- `requireEnv()` throws on missing required vars
- `optionalEnv()` returns default for optional vars
- Never access `process.env` directly in application code (exception: Supabase client setup)

## Supabase Client Pattern

**Two clients:**
- `createClient()` from `src/lib/supabase/server.ts` -- cookie-based auth for server components and actions
- `createServiceClient()` from `src/lib/supabase/service.ts` -- service role key for webhooks and background jobs

**Query Pattern:** Chainable query builder with explicit error handling:
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('column', value)
  .single()
if (error) throw new Error(error.message)
```

## Validation

**Library:** Zod for all input validation

**Pattern:** Define schema, infer type, parse at function entry:
```typescript
const Schema = z.object({ ... })
export type Input = z.infer<typeof Schema>
export async function handler(formData: Input) {
  const parsed = Schema.parse(formData)
  // ...
}
```

---

*Convention analysis: 2026-03-07*
