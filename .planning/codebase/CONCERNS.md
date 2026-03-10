# Codebase Concerns

**Analysis Date:** 2026-03-07

## Tech Debt

**Settings Object Overwrite on SMS Pause/Resume:**
- Issue: The Twilio SMS webhook handler replaces the entire `settings` JSONB column with `{ notifications_paused: true/false }`, destroying any other settings keys (e.g., `notification_threshold`, `quiet_hours_start`, `quiet_hours_end`).
- Files: `src/app/api/webhooks/twilio-sms/route.ts` (lines 96-104)
- Impact: Business owners who text "pause" then "resume" lose their notification threshold and quiet hours configuration.
- Fix approach: Read the existing `settings` JSON, merge the `notifications_paused` key, then write back. Use a pattern like:
  ```typescript
  const { data: current } = await supabase.from('clients').select('settings').eq('id', client.id).single()
  const merged = { ...(current?.settings ?? {}), notifications_paused: command.action === 'pause' }
  await supabase.from('clients').update({ settings: merged, updated_at: ... }).eq('id', client.id)
  ```

**Excessive `select('*')` Queries:**
- Issue: 30+ queries throughout the codebase use `.select('*')` when only a few columns are needed. This over-fetches data, increases serialization cost at RSC boundaries, and exposes unnecessary fields.
- Files: `src/app/actions/clients.ts`, `src/app/actions/customers.ts`, `src/app/actions/billing.ts`, `src/app/(dashboard)/calls/page.tsx`, `src/app/(dashboard)/leads/page.tsx`, `src/lib/retell/agent-builder.ts`, `src/lib/website/get-website-data.ts`, and many more (see Grep for `select('*')`)
- Impact: Wasted bandwidth and memory. Risk of leaking sensitive fields to client components.
- Fix approach: Replace each `.select('*')` with explicit column lists matching what the consumer actually uses.

**In-Memory Rate Limiter Does Not Work Across Serverless Instances:**
- Issue: Rate limiting uses an in-memory `Map` that resets on every cold start and is not shared across Vercel serverless function instances. Under load, each instance maintains its own counter, effectively multiplying the rate limit by the number of instances.
- Files: `src/lib/middleware/rate-limit.ts`
- Impact: Rate limiting is unreliable in production. A sustained attack spreads across instances and bypasses limits.
- Fix approach: Migrate to Upstash Redis (`@upstash/ratelimit`) for distributed rate limiting. The code already documents this intent in the file header comment.

**No Test Suite:**
- Issue: The `tests/` directory exists with subdirectories (`tests/lib/analysis`, `tests/lib/notifications`, `tests/lib/retell`, `tests/api/webhooks`, `tests/fixtures`) but contains zero test files. `jest.config.ts` exists but there are no tests to run.
- Files: `tests/` directory, `jest.config.ts`
- Impact: All changes ship without automated verification. Webhook handlers, lead extraction, notification logic, and billing actions are completely untested. Regressions go undetected until production.
- Fix approach: Prioritize tests for critical paths: (1) `src/app/api/webhooks/retell/route.ts` (call lifecycle), (2) `src/lib/analysis/lead-extraction.ts` (AI output parsing), (3) `src/lib/notifications/twilio.ts` (`shouldSendNotification` logic), (4) `src/app/actions/billing.ts` (Stripe operations).

**Hardcoded Pricing in OnboardingWizard:**
- Issue: Tier labels and prices (`$299/mo`, `$499/mo`, `$799/mo`) are hardcoded in the client component, duplicating values defined in `src/lib/stripe/products.ts`.
- Files: `src/components/dashboard/OnboardingWizard.tsx` (lines 16-20)
- Impact: Price changes require updating two locations. Risk of display/billing mismatch.
- Fix approach: Import tier metadata from a shared config or pass as props from the server component.

**Inconsistent `process.env` Access Patterns:**
- Issue: Some files use the centralized `env` utility (`src/lib/utils/env.ts`) while others access `process.env` directly with non-null assertions (`process.env.NEXT_PUBLIC_SUPABASE_URL!`).
- Files: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts`, `src/lib/retell/client.ts`, `src/app/(dashboard)/settings/page.tsx`, `src/app/actions/billing.ts` (line 236), `src/app/actions/invitations.ts` (line 63)
- Impact: No runtime validation for these direct accesses. Crashes with unhelpful `undefined` errors instead of clear "missing env var" messages.
- Fix approach: Route all env access through `src/lib/utils/env.ts`. Add entries for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`.

## Known Bugs

**Daily Summary Timezone Calculation Bug:**
- Symptoms: `todayStart` is constructed from a timezone-formatted date string but parsed as local time, not as the client's timezone. `new Date('2026-03-07T00:00:00')` creates midnight in the server's timezone (UTC on Vercel), not midnight in `America/New_York`.
- Files: `src/app/api/cron/daily-summary/route.ts` (lines 114-120)
- Trigger: Running daily summary for any client whose timezone differs from the server timezone.
- Workaround: None. Summaries may include calls from the wrong day.

**Top Lead Query in Daily Summary Is Not Sorted by Score:**
- Symptoms: The `buildDailySummary` function queries for the "top lead" but fetches the most recent lead (ordered by `created_at`) rather than the highest-scored lead. The subsequent query fetches a single lead with `call_id IS NOT NULL` with no score ordering.
- Files: `src/app/api/cron/daily-summary/route.ts` (lines 149-187)
- Trigger: Any day with multiple leads -- the reported "top lead" may not be the highest scored.
- Workaround: None.

## Security Considerations

**Public API Endpoint CORS Wildcard:**
- Risk: The public client API (`GET /api/public/client/[slug]`) sets `Access-Control-Allow-Origin: *`, allowing any origin to fetch business data including phone numbers, addresses, and knowledge base content.
- Files: `src/app/api/public/client/[slug]/route.ts` (lines 5-9)
- Current mitigation: Data is intentionally public (for client websites). Rate limiting at 30 req/min/IP.
- Recommendations: Consider restricting CORS to known client website domains once websites are deployed. Rate limit by slug as well as IP to prevent data scraping across all clients.

**TwiML Response Not XML-Escaped:**
- Risk: The `twimlResponse` helper in the Twilio SMS webhook inserts the message string directly into XML without escaping. If the message contains `<`, `>`, `&`, or quotes, the TwiML will be malformed.
- Files: `src/app/api/webhooks/twilio-sms/route.ts` (lines 138-144)
- Current mitigation: All current message strings are hardcoded and safe.
- Recommendations: Add XML escaping: replace `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;` before inserting into the TwiML template.

**Invitation Token in URL (GET parameter):**
- Risk: Invitation tokens are passed via URL query string (`/signup?token=...`). URLs can leak through browser history, server logs, referrer headers, and analytics.
- Files: `src/app/actions/invitations.ts` (line 65)
- Current mitigation: Tokens are one-time use and have expiry dates.
- Recommendations: Use short-lived tokens (current expiry check exists). Consider POST-based token validation to avoid URL leakage.

**`nodeEnv` Not Lazy:**
- Risk: `env.nodeEnv` is evaluated at module import time (not wrapped in a function like other env vars), which means it captures the value at build time in some contexts.
- Files: `src/lib/utils/env.ts` (line 42)
- Current mitigation: `NODE_ENV` is typically set correctly at build time.
- Recommendations: Make it a function like the other accessors: `nodeEnv: () => optionalEnv('NODE_ENV', 'development')`.

## Performance Bottlenecks

**Dashboard Home Page Sequential Waterfall:**
- Problem: The main dashboard page (`DashboardPage`) makes 3 sequential Supabase queries (recent calls, hot leads, chart data) that could run in parallel.
- Files: `src/app/(dashboard)/page.tsx` (lines 91-119)
- Cause: Each query awaits before the next begins.
- Improvement path: Use `Promise.all()` to parallelize the three independent queries.

**Daily Summary N+1 Query Pattern:**
- Problem: `buildDailySummary` runs 4 sequential queries for each client, and the outer loop processes clients sequentially. For N clients, this is 4N sequential queries.
- Files: `src/app/api/cron/daily-summary/route.ts` (lines 66-99, 108-199)
- Cause: Sequential `for` loop with awaited operations per client. Each client triggers calls query, leads query, top lead query, and call score query.
- Improvement path: (1) Parallelize the 4 queries per client with `Promise.all()`. (2) Process clients in parallel batches (e.g., `Promise.all` with concurrency limit of 5). (3) Consider a single aggregation query across all clients.

**Retell Webhook Handler Multiple Sequential DB Writes:**
- Problem: The `handleCallEnded` handler performs 5-8 sequential database operations: update call status, fetch call record, analyze transcript (AI call), update call with analysis, insert lead, send SMS, update lead notification flag.
- Files: `src/app/api/webhooks/retell/route.ts` (lines 116-251)
- Cause: Each operation awaits before the next. Some operations are independent and could be parallelized.
- Improvement path: Group independent operations. For example, after lead extraction completes, the call metadata update and lead insert can run in parallel.

## Fragile Areas

**Lead Extraction JSON Parsing:**
- Files: `src/lib/analysis/lead-extraction.ts` (lines 72-82)
- Why fragile: Relies on Claude Haiku returning valid JSON without markdown fencing. The regex stripping of code fences is a best-effort heuristic. If the model changes response format, parsing fails silently with a `SyntaxError`.
- Safe modification: Always validate the parsed object against a Zod schema before using it. Add retry logic (1-2 retries) on `SyntaxError`.
- Test coverage: None.

**Webhook Idempotency Depends on Separate Log Tables:**
- Files: `src/app/api/webhooks/retell/route.ts` (lines 46-55, 80-84), `src/app/api/webhooks/stripe/route.ts` (lines 41-49, 84-88)
- Why fragile: Idempotency check and processing log insert are not atomic. If the handler succeeds but the log insert fails, the next retry will reprocess the event (duplicate lead creation, duplicate SMS).
- Safe modification: Wrap the handler + log insert in a Supabase RPC function or use a database transaction.
- Test coverage: None.

**OnboardingWizard Multi-Step State:**
- Files: `src/components/dashboard/OnboardingWizard.tsx` (633 lines)
- Why fragile: Largest component in the codebase. All form state is in a single `useState` object. Step validation is a switch statement. A partial failure during onboarding (e.g., Retell fails but client + agent_config succeed) leaves the system in an inconsistent state that requires manual resolution.
- Safe modification: The `onboardClient` server action already handles partial failures gracefully by returning `clientId` even on Retell failure. But the client-side wizard has no way to retry just the failed step.
- Test coverage: None.

## Scaling Limits

**Single Twilio Phone Number for All Outbound SMS:**
- Current capacity: All client owner notifications go through one Twilio number (`TWILIO_PHONE_NUMBER`).
- Limit: Twilio rate limits per phone number (typically 1 SMS/second for long codes, 10/second for short codes). At ~20+ active clients with frequent calls, notifications will queue and delay.
- Scaling path: Use Twilio Messaging Service with a number pool, or assign per-client Twilio numbers.

**Knowledge Base in Full System Prompt:**
- Current capacity: All knowledge base entries are concatenated into the Retell LLM system prompt.
- Limit: LLM context window. As clients add more knowledge entries, the prompt grows unbounded. Very large prompts increase latency and cost.
- Scaling path: Implement RAG (retrieval-augmented generation) -- embed knowledge entries, retrieve relevant ones per call context. The CLAUDE.md already notes this as a future optimization.

## Dependencies at Risk

**`retell-sdk` Tight Coupling:**
- Risk: The Retell API client is used directly throughout `src/lib/retell/agent-builder.ts` and `src/lib/retell/client.ts`. If Retell changes their API or SDK, multiple files break.
- Impact: Agent creation, prompt syncing, phone number provisioning all fail.
- Migration plan: Already somewhat isolated behind `agent-builder.ts`. Consider adding a thin wrapper/interface so the SDK can be swapped.

## Missing Critical Features

**No Usage Tracking / Metering:**
- Problem: Subscription tiers include call minute limits (500, 1000, unlimited) but there is no tracking of actual minutes consumed per client.
- Blocks: Cannot enforce tier limits, cannot show usage dashboards, cannot do overage billing.

**No Automated Retell Agent Sync on Knowledge Base Changes:**
- Problem: When a client's knowledge base is updated via the dashboard, the Retell agent prompt is not automatically rebuilt and synced. The `updateRetellAgent` function exists but must be called manually.
- Blocks: Knowledge base updates do not take effect until someone manually triggers a sync.

## Test Coverage Gaps

**Webhook Handlers (Critical Priority):**
- What's not tested: `src/app/api/webhooks/retell/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/twilio-sms/route.ts`
- Risk: These are the primary data ingestion points. Signature verification, event routing, idempotency, and database writes are all untested. A regression here means lost calls, leads, or billing data.
- Priority: High

**Server Actions (Critical Priority):**
- What's not tested: All files in `src/app/actions/` (clients, billing, customers, knowledge, invitations, leads, playbooks, website)
- Risk: Business logic for onboarding, Stripe integration, CRM operations. Auth checks in server actions are untested.
- Priority: High

**Notification Logic (High Priority):**
- What's not tested: `src/lib/notifications/twilio.ts` (`shouldSendNotification` with quiet hours, thresholds), `src/lib/notifications/parser.ts` (owner command parsing)
- Risk: Wrong notifications sent (or not sent) during quiet hours, threshold miscalculation, command misparse.
- Priority: High

**Lead Extraction (High Priority):**
- What's not tested: `src/lib/analysis/lead-extraction.ts` (Claude response parsing, JSON extraction, score clamping)
- Risk: Malformed AI responses cause unhandled errors. Score values outside 1-10 range.
- Priority: High

**Rate Limiting (Medium Priority):**
- What's not tested: `src/lib/middleware/rate-limit.ts` (sliding window logic, cleanup, IP extraction)
- Risk: Rate limit bypass or false positives blocking legitimate traffic.
- Priority: Medium

---

*Concerns audit: 2026-03-07*
