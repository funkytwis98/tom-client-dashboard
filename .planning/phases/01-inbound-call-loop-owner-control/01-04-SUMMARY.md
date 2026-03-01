---
phase: 01-inbound-call-loop-owner-control
plan: 04
subsystem: api
tags: [claude, anthropic, lead-extraction, analysis, tdd, jest, haiku]

requires:
  - phase: 01-01
    provides: Next.js project structure, Supabase schema
  - phase: 01-02
    provides: LeadAnalysis type in api.ts, CallAnalysis type, env.ts with anthropicApiKey()
  - phase: 01-03
    provides: POST /api/webhooks/retell with call_ended handler and TODO(Plan 04) placeholder

provides:
  - analyzeCallTranscript(transcript) — Claude Haiku JSON analysis returning LeadAnalysis with is_lead, caller_name, service_interested, notes, urgency, lead_score, summary, sentiment, requires_callback
  - scoreCallQuality(transcript, durationMs) — returns integer 1-10 call quality score; short calls (<10s) skip Claude
  - Lead extraction integrated into webhook call_ended path — creates lead record in Supabase when is_lead=true
  - Call record updated with AI-derived sentiment, lead_score, summary, caller_name after each completed call

affects:
  - 01-05 (owner notification — reads lead_score from analysis to trigger SMS for score >= 9)
  - 01-09 (dashboard — calls now have lead_score, sentiment, summary for display)

tech-stack:
  added:
    - "@anthropic-ai/sdk ^0.78.0 (Claude API client)"
  patterns:
    - "Lazy singleton pattern for Anthropic client to enable test mocking without module-level side effects"
    - "TDD: RED → GREEN → REFACTOR with jest.mock('__esModule: true') for ESM SDK compatibility"
    - "Prompt engineering for JSON output (no json_object response_format needed — instruction in prompt)"
    - "Non-fatal error handling for lead extraction — call is logged even if Claude analysis fails"

key-files:
  created:
    - src/lib/analysis/lead-extraction.ts
    - src/lib/analysis/call-scoring.ts
    - tests/lib/analysis/lead-extraction.test.ts
    - tests/lib/analysis/call-scoring.test.ts
  modified:
    - src/app/api/webhooks/retell/route.ts (replaced TODO(Plan 04) with actual analyzeCallTranscript call)

key-decisions:
  - "Lazy Anthropic client initialization (let _anthropic = null, init on first call) to support Jest mocking — module-level new Anthropic() runs before jest.mock() takes effect"
  - "Use __esModule: true in Jest mock factory for @anthropic-ai/sdk — required for ESM-packaged SDKs compiled to CJS by ts-jest"
  - "Lead extraction is non-fatal — errors are caught and logged, call record is always preserved"
  - "Claude Haiku (claude-3-5-haiku-20241022) selected over Sonnet/Opus for cost efficiency on per-call extraction"
  - "lead_score clamped via Math.max(1, Math.min(10, Math.round(value))) to ensure integer 1-10 even if Claude returns out-of-range or fractional values"

patterns-established:
  - "Lazy Anthropic client: let _client = null; function getClient() { if (!_client) _client = new Anthropic(...); return _client }"
  - "Jest ESM mock: jest.mock('pkg', () => ({ __esModule: true, default: jest.fn().mockImplementation(...) }))"
  - "TDD analysis tests: mock messages.create → verify LeadAnalysis field extraction and clamping behavior"

requirements-completed: [LEAD-01, LEAD-02, CALL-02]

duration: 25min
completed: 2026-03-01
---

# Phase 1 Plan 4: Call Transcript Analysis Summary

**Claude Haiku-powered lead extraction from call transcripts with integer 1-10 scoring, lead creation in Supabase, and full TDD test coverage**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-01T19:50:07Z
- **Completed:** 2026-03-01T20:15:00Z
- **Tasks:** 1 (TDD: RED + GREEN + REFACTOR phases)
- **Files modified:** 5

## Accomplishments
- `analyzeCallTranscript()` returns structured `LeadAnalysis` with all required fields using Claude Haiku
- `scoreCallQuality()` returns 1-10 integer quality score; short calls (<10s) return 2 without calling Claude
- Lead records automatically created in Supabase when `is_lead=true` from analysis
- Call records updated with `sentiment`, `lead_score`, `summary`, `caller_name` after each completed call
- 18 unit tests covering: qualified leads, wrong numbers, urgency detection, name extraction, score clamping, invalid JSON errors

## Task Commits

1. **RED Phase: Failing tests for lead-extraction and call-scoring** - `44d56d3` (test)
2. **GREEN + REFACTOR: Implement analyzeCallTranscript, scoreCallQuality, webhook integration** - `44d56d3` (feat)

Note: RED and GREEN phases committed together as one atomic commit since tests and implementation were developed in the same session.

**Plan metadata:** See final state update commit.

## Files Created/Modified
- `src/lib/analysis/lead-extraction.ts` - Claude Haiku analysis with JSON prompt, clamping, lazy client init
- `src/lib/analysis/call-scoring.ts` - Integer quality scoring, short-call early return
- `tests/lib/analysis/lead-extraction.test.ts` - 10 tests: qualified leads, wrong numbers, urgency, clamping, null fields, invalid JSON
- `tests/lib/analysis/call-scoring.test.ts` - 8 tests: short-call bypass, score range, clamping, non-numeric fallback
- `src/app/api/webhooks/retell/route.ts` - Replaced TODO(Plan 04) with actual analyzeCallTranscript call + lead creation

## Decisions Made
- Lazy Anthropic client initialization required for Jest mocking — module-level `new Anthropic()` runs before `jest.mock()` takes effect
- `__esModule: true` in Jest mock factory required for `@anthropic-ai/sdk` (ESM package compiled to CJS by ts-jest)
- Lead extraction errors caught non-fatally — call is always logged even if Claude analysis fails
- Claude Haiku model for cost efficiency (~$0.001/call vs ~$0.01 for Sonnet)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy Anthropic client initialization to support Jest mocking**
- **Found during:** GREEN phase (test execution)
- **Issue:** Module-level `const anthropic = new Anthropic({ apiKey: env.anthropicApiKey() })` executed before `jest.mock('@anthropic-ai/sdk')` was hoisted, causing `sdk_1.default is not a constructor` error
- **Fix:** Changed to lazy singleton pattern: `let _anthropic = null; function getClient() {...}`
- **Files modified:** src/lib/analysis/lead-extraction.ts, src/lib/analysis/call-scoring.ts
- **Verification:** All 18 analysis tests pass after fix
- **Committed in:** 44d56d3

**2. [Rule 1 - Bug] Added __esModule: true to Jest mock factory for Anthropic SDK**
- **Found during:** GREEN phase (test execution after lazy init fix)
- **Issue:** Even with lazy init, `sdk_1.default is not a constructor` because ts-jest CJS transform needs `__esModule: true` to handle default exports correctly
- **Fix:** Added `__esModule: true` to both mock factories in test files
- **Files modified:** tests/lib/analysis/lead-extraction.test.ts, tests/lib/analysis/call-scoring.test.ts
- **Verification:** All 18 analysis tests pass
- **Committed in:** 44d56d3

---

**Total deviations:** 2 auto-fixed (2 bugs — test infrastructure ESM/CJS interop)
**Impact on plan:** Both fixes necessary for test infrastructure to work. No scope change.

## Issues Encountered
- ESM/CJS interop between `@anthropic-ai/sdk` (ESM package) and ts-jest (CJS transformer) required two-step fix: lazy init + `__esModule: true` in mock factory. Pattern is now established for any other ESM SDK mocking in this project.

## User Setup Required
None — no external service configuration required. `ANTHROPIC_API_KEY` env var was already in `env.ts` from Plan 01-02.

## Next Phase Readiness
- Lead extraction integrated into webhook handler — leads now automatically appear in Supabase on call_ended
- Call records enriched with sentiment, score, summary for dashboard display
- `analysis.lead_score` is available in call_ended handler for Plan 05 owner notification threshold check (score >= 9)
- Ready for Plan 05 owner SMS notifications

---
*Phase: 01-inbound-call-loop-owner-control*
*Completed: 2026-03-01*
