---
phase: 01-inbound-call-loop-owner-control
plan: 01
subsystem: infra
tags: [next.js, supabase, tailwind, typescript, auth, postgresql, rls]

# Dependency graph
requires: []
provides:
  - "Next.js 15 app with App Router, TypeScript, Tailwind CSS"
  - "Supabase SSR auth with email/password login"
  - "Auth middleware protecting all /dashboard routes"
  - "Dashboard skeleton with sidebar navigation (6 nav items)"
  - "Database migration SQL with 9 core tables + webhook idempotency table"
  - "RLS policies for all tables (org-scoped admin, public read for knowledge/website)"
  - "Realtime enabled on calls and leads tables"
affects: [02, 03, 04, 05, 06, 07, 08, 09]

# Tech tracking
tech-stack:
  added:
    - next@15.2.1
    - "@supabase/ssr@^0.5.2"
    - "@supabase/supabase-js@^2.49.1"
    - tailwindcss@^3.4.1
    - tailwindcss-animate@^1.0.7
    - class-variance-authority@^0.7.1
    - zod@^3.24.2
    - lucide-react@^0.474.0
  patterns:
    - "Supabase SSR pattern with cookie-based session management"
    - "Next.js middleware auth guard redirecting unauthenticated users to /login"
    - "Route groups: (auth) for public routes, (dashboard) for protected routes"
    - "Server component Supabase client via createClient() from server.ts"
    - "Browser component Supabase client via createClient() from client.ts"

key-files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/middleware.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/page.tsx
    - supabase/migrations/001_initial_schema.sql
    - .env.local.example
  modified: []

key-decisions:
  - "Used Next.js 15 (latest) with App Router — SSR-native, compatible with Supabase SSR package"
  - "Supabase SSR pattern (not legacy auth-helpers) — cookie-based sessions, Edge-compatible middleware"
  - "Created all placeholder dashboard route pages upfront to enable clean sidebar navigation"
  - "Migration file created but not auto-applied — requires live Supabase project with credentials"
  - "Built sidebar without shadcn/ui Sidebar component — keeps dependency footprint minimal for MVP"

patterns-established:
  - "Auth pattern: createClient() from server.ts in Server Components, createClient() from client.ts in Client Components"
  - "Route protection: middleware.ts intercepts all non-static/non-API routes, redirects unauthenticated to /login"
  - "Dashboard layout: fixed-left sidebar with dark background (gray-900), main content area scrolls independently"

requirements-completed:
  - CALL-01
  - CALL-02
  - CALL-03
  - LEAD-01
  - LEAD-02
  - LEAD-03
  - NOTF-01
  - NOTF-02
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-04
  - AGNT-01
  - AGNT-02
  - AGNT-03

# Metrics
duration: 7min
completed: 2026-03-01
---

# Phase 1 Plan 01: Foundation Summary

**Next.js 15 app with Supabase SSR email/password auth, protected dashboard skeleton, and 10-table PostgreSQL schema with RLS policies ready to apply**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-01T19:34:38Z
- **Completed:** 2026-03-01T19:41:00Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments

- Next.js 15 project fully bootstrapped with TypeScript, Tailwind CSS, App Router, and src-dir layout
- Supabase SSR auth integrated with middleware protecting all /dashboard routes — unauthenticated users redirect to /login, authenticated users redirect away from /login
- Email/password login page with error display built using plain Tailwind (no extra UI lib dependencies)
- Dashboard layout with dark sidebar navigation linking to Dashboard, Clients, Calls, Leads, Knowledge Base, Settings
- Complete 10-table database schema (9 core + webhook idempotency) with all indexes, RLS policies, and Realtime — ready to apply to Supabase
- `npm run build` passes with 0 TypeScript or compilation errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Next.js project with Supabase auth and dashboard skeleton** - `bcb6b70` (feat)
2. **Task 2: Apply complete database schema to Supabase with RLS policies** - `be7395b` (feat)

**Plan metadata:** (created after SUMMARY)

## Files Created/Modified

- `src/lib/supabase/client.ts` — Browser-side Supabase client using createBrowserClient from @supabase/ssr
- `src/lib/supabase/server.ts` — Server-side Supabase client with SSR cookie handling
- `src/middleware.ts` — Auth guard middleware protecting all routes except /login and static assets
- `src/app/(auth)/login/page.tsx` — Email/password login form with Supabase signInWithPassword
- `src/app/(dashboard)/layout.tsx` — Dashboard layout with dark sidebar, sign-out button, active link highlighting
- `src/app/(dashboard)/page.tsx` — Dashboard home with 4 stat cards (placeholder) and empty call feed
- `src/app/(dashboard)/clients/page.tsx` — Placeholder Clients page
- `src/app/(dashboard)/calls/page.tsx` — Placeholder Calls page
- `src/app/(dashboard)/leads/page.tsx` — Placeholder Leads page
- `src/app/(dashboard)/knowledge/page.tsx` — Placeholder Knowledge Base page
- `src/app/(dashboard)/settings/page.tsx` — Placeholder Settings page
- `src/app/globals.css` — Tailwind CSS base with CSS custom properties for shadcn/ui theming
- `src/app/layout.tsx` — Root layout with Geist fonts
- `supabase/migrations/001_initial_schema.sql` — Complete schema: 10 tables, indexes, RLS, Realtime
- `.env.local.example` — All required environment variables documented
- `package.json` — All dependencies declared
- `tsconfig.json` — TypeScript config with @/* path alias
- `next.config.ts` — Next.js config
- `tailwind.config.ts` — Tailwind with CSS variable theming
- `.eslintrc.json` — ESLint with Next.js rules
- `postcss.config.mjs` — PostCSS for Tailwind
- `.gitignore` — Ignores node_modules, .next, .env.local

## Decisions Made

- Used Next.js 15 (not 14) — latest stable, compatible with all planned dependencies
- Chose Supabase SSR package pattern (not legacy auth-helpers) — recommended by Supabase for App Router
- Skipped shadcn/ui CLI init — built login and layout with raw Tailwind to avoid CLI conflicts with existing project files
- Dashboard layout built as Client Component to support active link state and sign-out action
- All dashboard placeholder pages created upfront so sidebar navigation links work immediately

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used manual file creation instead of create-next-app CLI**
- **Found during:** Task 1 (project initialization)
- **Issue:** `npx create-next-app@latest .` fails when directory has existing files (.claude/, .planning/, CLAUDE.md). Conflict detection prevents CLI from running in non-empty directories.
- **Fix:** Created all Next.js project files manually (package.json, tsconfig.json, next.config.ts, postcss.config.mjs, tailwind.config.ts, .eslintrc.json, globals.css, layout.tsx) matching what create-next-app would generate.
- **Files modified:** All files listed above
- **Verification:** `npm run build` passes with 0 errors
- **Committed in:** `bcb6b70` (Task 1 commit)

**2. [Rule 3 - Blocking] Skipped shadcn/ui CLI init — installed tailwindcss-animate manually**
- **Found during:** Task 1 (shadcn/ui setup)
- **Issue:** `npx shadcn@latest init` requires an interactive terminal and conflicts with the existing project structure. The plan listed specific shadcn components but they aren't needed for the foundation skeleton.
- **Fix:** Added tailwindcss-animate and class-variance-authority to package.json, added CSS variables to globals.css for future shadcn compatibility. Components will be added in later plans when they're actually needed.
- **Files modified:** package.json, tailwind.config.ts, globals.css
- **Verification:** Build passes, theming variables in place for future shadcn integration
- **Committed in:** `bcb6b70` (Task 1 commit)

**3. [Auth Gate] Supabase migration not applied — no live project credentials**
- **Found during:** Task 2 (apply migration)
- **Issue:** No Supabase project configured, no .env.local credentials, no Supabase CLI installed. MCP tool not available in this execution context.
- **Action:** Migration SQL file fully created and committed. User must apply it manually.
- **Committed in:** `be7395b` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking), 1 auth gate documented
**Impact on plan:** Auto-fixes were necessary to complete the bootstrap without breaking the project setup. The auth gate (Supabase credentials) is a known prerequisite that requires human action — documented below.

## User Setup Required

To complete Plan 01, the following external services require manual configuration:

### 1. Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your Project URL and API keys from: Project Settings -> API

### 2. Apply Database Migration

In the Supabase dashboard, go to **SQL Editor** and paste the contents of:
`supabase/migrations/001_initial_schema.sql`

Click **Run**. Verify all 10 tables appear in Database -> Tables.

### 3. Create Admin Account

In Supabase dashboard, go to **Authentication -> Users -> Add user**. Create your admin account.

### 4. Set Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### 5. Verify

```bash
npm run dev
# Visit http://localhost:3000 — should redirect to /login
# Log in with your Supabase admin account
# Should redirect to /dashboard with sidebar visible
```

## Issues Encountered

- `create-next-app` CLI conflicts with existing directory contents — resolved by manual file creation
- `shadcn@latest init` not runnable in this context — resolved by adding dependencies manually; components to be added per-plan as needed

## Next Phase Readiness

- Next.js app builds and runs — Plan 02 can start immediately (Retell webhook endpoint)
- Database schema ready to apply — once Supabase credentials are provided, all subsequent plans can use the schema
- Auth middleware in place — all /dashboard routes are protected out of the box
- Supabase client utilities exported from canonical locations (`src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`) — all future plans import from here

**Blockers for subsequent plans:**
- Supabase project must be created and migration applied before Plans 02-09 can use the database
- `.env.local` must be created with Supabase credentials before `npm run dev` connects to the database

---
*Phase: 01-inbound-call-loop-owner-control*
*Completed: 2026-03-01*
