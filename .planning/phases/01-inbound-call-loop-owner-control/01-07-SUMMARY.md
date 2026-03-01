---
phase: 01-inbound-call-loop-owner-control
plan: 07
subsystem: ui
tags: [next.js, supabase, realtime, react, server-actions, optimistic-ui]

# Dependency graph
requires:
  - phase: 01-inbound-call-loop-owner-control
    provides: "domain types (Call, Lead, Client), supabase client/server helpers, actions/agents.ts and actions/knowledge.ts patterns"
provides:
  - "Calls list page with Supabase Realtime live updates and direction/status filters"
  - "Call detail page with transcript, recording player, AI summary, and lead quick actions"
  - "Leads pipeline page with optimistic status updates (contacted/booked/lost)"
  - "Clients list page with status badges and navigation to client sub-pages"
  - "updateLeadStatus and getLeadsForClient server actions"
  - "getClients and getClient server actions"
affects: [01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useOptimistic + useTransition for instant lead status updates without full page reload"
    - "Supabase Realtime postgres_changes subscription for live call list updates"
    - "Server components as data-fetching shell + client component for interactivity"
    - "URL search params as filter state for SSR-compatible call log filtering"

key-files:
  created:
    - src/app/actions/leads.ts
    - src/app/actions/clients.ts
    - src/components/dashboard/LeadsPipeline.tsx
    - src/components/dashboard/CallLogTable.tsx
    - src/components/dashboard/CallDetail.tsx
    - src/app/(dashboard)/clients/page.tsx
    - src/app/(dashboard)/clients/[id]/calls/page.tsx
    - src/app/(dashboard)/clients/[id]/calls/[callId]/page.tsx
    - src/app/(dashboard)/clients/[id]/leads/page.tsx
  modified: []

key-decisions:
  - "List view (not kanban) for leads pipeline — simpler to build, ship kanban in Phase 2"
  - "URL search params for filter state — SSR-compatible, shareable, no client state needed for filter persistence"
  - "Load-more button instead of pagination — simpler for MVP, avoids pagination complexity"
  - "useOptimistic for lead status updates — instant UI feedback without waiting for server round-trip"

patterns-established:
  - "Dashboard pages: server component fetches initial data, passes to client component for interactivity"
  - "Quick action buttons: useOptimistic + useTransition pattern for all lead status mutations"

requirements-completed: [DASH-01, DASH-02, LEAD-03]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 01 Plan 07: Calls and Leads Dashboard Pages Summary

**Searchable call log with Supabase Realtime live updates, full call detail with transcript/recording/lead, and leads pipeline with optimistic status quick actions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T20:13:02Z
- **Completed:** 2026-03-01T20:18:00Z
- **Tasks:** 2/2
- **Files modified:** 9 created

## Accomplishments
- CallLogTable client component subscribes to Supabase Realtime postgres_changes — new calls slide into the list without page reload
- Call detail page renders transcript with speaker labels, audio recording player, AI summary, and associated lead quick actions
- LeadsPipeline uses useOptimistic + useTransition for instant status changes (contacted/booked/lost) with server revalidation
- Clients list page shows all clients as navigable cards with subscription status badges
- Filter state lives in URL search params — filters survive page refresh and are shareable

## Task Commits

Each task was committed atomically:

1. **Task 1: Lead status Server Action and leads pipeline component** - `81708c8` (feat)
2. **Task 2: Call log page with Realtime and call detail page** - `0797e18` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/app/actions/leads.ts` - updateLeadStatus and getLeadsForClient server actions
- `src/app/actions/clients.ts` - getClients and getClient server actions
- `src/components/dashboard/LeadsPipeline.tsx` - Client component with optimistic UI, urgency/status badges, quick action buttons
- `src/components/dashboard/CallLogTable.tsx` - Client component with Supabase Realtime subscription, load-more, URL filter sync
- `src/components/dashboard/CallDetail.tsx` - Transcript display, audio player, sentiment badge, lead card with quick actions
- `src/app/(dashboard)/clients/page.tsx` - Clients list as cards with status badges
- `src/app/(dashboard)/clients/[id]/calls/page.tsx` - Server component passing filtered initial calls to CallLogTable
- `src/app/(dashboard)/clients/[id]/calls/[callId]/page.tsx` - Server component fetching call + lead, 404 on not found
- `src/app/(dashboard)/clients/[id]/leads/page.tsx` - Server component passing initial leads to LeadsPipeline

## Decisions Made
- List view (not kanban) for leads pipeline — simpler MVP, kanban deferred to Phase 2
- URL search params for filter state — SSR-compatible, shareable, no extra client state
- Load-more button instead of true pagination — lower complexity for MVP
- useOptimistic for lead status — instant visual feedback while server action runs

## Deviations from Plan

None - plan executed exactly as written. Note: plan referenced shadcn Badge, Table, and Button components but the project has no shadcn installed. Used plain Tailwind CSS equivalents that produce identical visual results (inline-flex badge spans, table elements, button elements). No functional deviation.

## Issues Encountered
- shadcn not installed in project (plan referenced it) — used plain Tailwind CSS equivalents instead. All visual results identical.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard pages complete — admin can view all calls, transcripts, recordings, and manage lead status
- Plan 01-08 can add analytics/stats to the dashboard home page
- Supabase Realtime must be enabled on the `calls` table in the Supabase dashboard for live updates to work
- Plan 01-09 can complete Interstate Tires knowledge base seeding

---
*Phase: 01-inbound-call-loop-owner-control*
*Completed: 2026-03-01*
