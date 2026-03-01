# Technology Stack

**Project:** AI Phone Receptionist B2B SaaS
**Researched:** 2026-03-01
**Confidence Level:** HIGH (core stack decisions already made in CLAUDE.md)

---

## Executive Summary

The chosen stack (Next.js 14+ App Router, Supabase, Retell AI, Twilio SMS, Vercel) is well-aligned for a B2B SaaS phone receptionist service. This research validates those choices and identifies supporting libraries for call handling, real-time updates, notifications, and dashboard development.

**Key principle:** Ship fast with proven, well-integrated technologies. Avoid bleeding-edge tools that require constant maintenance. The primary complexity is in Retell AI integration and webhook handling, not in the framework choices.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Next.js** | 14.x+ (App Router) | Dashboard + API routes + webhooks | - App Router provides server/client separation for optimal performance<br/>- Built-in API routes for Retell/Twilio webhooks<br/>- Vercel deployment integration (automatic)<br/>- Streaming responses for real-time updates<br/>- Middleware support for auth guards<br/>- Stable, widely-used for SaaS dashboards |
| **React** | 18.x+ (via Next.js) | UI components for dashboard | - Server components reduce bundle size<br/>- Suspense for async data loading<br/>- Built-in hooks for state management |
| **TypeScript** | 5.x+ | Type safety throughout | - Catches errors at build time, not runtime<br/>- Critical for webhook handlers and API contracts<br/>- Self-documenting code for team scale<br/>- Required for Retell API integration |

### Real-Time & Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Supabase** | Latest (managed) | Database + Auth + Realtime | - PostgreSQL foundation with proven scalability<br/>- Row-level security (RLS) for multi-tenant safety<br/>- Realtime subscriptions via Postgres LISTEN/NOTIFY<br/>- Edge Functions for background processing<br/>- Built-in JWT auth (works with Next.js middleware)<br/>- Webhooks for DB events (e.g., new call → trigger notification)<br/>- pgvector support for future RAG implementation<br/>- Free tier sufficient for MVP (~4 GB storage, 2 GB bandwidth) |
| **@supabase/supabase-js** | 2.x+ | JavaScript client | - Official SDK, well-maintained<br/>- Realtime subscriptions for live dashboards<br/>- Type generation from database schema (supabase-js types)<br/>- Works in both server and client components |

### Voice & Telephony

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Retell AI** | Latest API | Inbound/outbound calling, voice agent, SMS | - $0.07-$0.14/min all-inclusive (with Claude LLM)<br/>- Native Claude integration (no LLM wrapper)<br/>- Sub-800ms latency with interruption handling<br/>- Call transcription + analysis included<br/>- Webhook-based event streaming (call_started, call_ended, call_analyzed)<br/>- Built-in voice selection (multiple options)<br/>- Native SMS support (optional alternative to Twilio)<br/>- Tried and tested for B2B receptionist use cases<br/>- SOC 2, HIPAA, GDPR compliant<br/>- 60 free minutes + 20 concurrent calls to start |
| **No SDK needed** | N/A | Call Retell API directly | - Retell doesn't have a strong TypeScript SDK<br/>- Their REST API is straightforward<br/>- Build a simple wrapper in `lib/retell/client.ts` for fetch calls<br/>- Keeps dependencies minimal, reduces version conflicts |

### SMS & Notifications

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Twilio** | 3.x+ (Node SDK) | SMS notifications to owner, parse inbound replies | - Industry standard for SMS delivery<br/>- Reliable webhook delivery for inbound messages<br/>- Well-documented, stable API<br/>- Alternative: Use Retell native SMS (simpler, one account)<br/>- Start with Twilio for MVP (separate SMS flow), switch to Retell SMS if needed (Phase 2) |
| **twilio** (npm package) | 3.x+ | TypeScript SMS client | - Official Twilio Node SDK<br/>- Easy to use for sending and receiving SMS<br/>- Error handling and retry logic built-in |

### Deployment & Hosting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vercel** | N/A (managed platform) | Hosting for Next.js app, Serverless Functions | - Native Next.js integration (zero config)<br/>- Edge Functions for webhook processing<br/>- Automatic deployments from git<br/>- Environment variables management<br/>- Free tier sufficient for MVP<br/>- Scales automatically with traffic |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **next-auth** | 5.x+ (optional) | Authentication & session management | NOT FOR MVP: Supabase auth is sufficient; add if you need 3rd-party OAuth (Google, GitHub login). For MVP, use email/password via Supabase. |
| **zod** | 3.x+ | Schema validation | - Validate Retell webhook payloads<br/>- Validate form inputs in dashboard<br/>- Type-safe runtime validation<br/>- Small bundle size (~10KB) |
| **axios** or **node-fetch** | Latest | HTTP client for API calls | - Make requests to Retell, Twilio, Stripe APIs<br/>- axios is heavier but has better defaults; use native fetch for minimal deps<br/>- Recommend: native `fetch()` built into Node 18+ to reduce deps |
| **date-fns** | 3.x+ | Date/time utilities | - Format timestamps in call logs<br/>- Parse business hours<br/>- Calculate follow-up times<br/>- Smaller alternative to moment.js (~13KB vs 67KB) |
| **recharts** | 2.x+ | Charting library for analytics | - Lightweight React charts<br/>- Use in Phase 2 for analytics dashboard<br/>- For MVP, basic tables and counters are fine |
| **react-hook-form** | 7.x+ | Form handling in dashboard | - Manage Knowledge Base editor form<br/>- Client onboarding form<br/>- Better performance than controlled components<br/>- ~9KB minified |
| **tailwindcss** | 3.x+ | CSS framework for UI | - Included in `create-next-app --tailwind` template<br/>- Utility-first CSS speeds up dashboard development<br/>- No custom CSS to maintain |
| **headlessui** | 1.x+ | Unstyled, accessible components | - Build modals, dropdowns, tabs<br/>- Works great with Tailwind<br/>- Small bundle footprint |
| **lucide-react** | Latest | Icon library | - Lightweight, tree-shakeable icon set<br/>- Perfect for SaaS dashboards<br/>- ~50KB total for commonly used icons |
| **winston** or **pino** | Latest | Structured logging | - Log webhook events, API errors, lead scoring<br/>- Easier debugging than console.log<br/>- Structured JSON logs for monitoring<br/>- Start with Pino (smaller, faster) |
| **dotenv** | 16.x+ | Environment variable management | - Load `.env.local` in development<br/>- Vercel handles this in production<br/>- Small utility, standard practice |

---

## Database Libraries & ORM (Not Recommended for MVP)

| Technology | Why Not |
|-----------|---------|
| **Prisma** | - Adds complexity for simple SQL use case<br/>- Generates verbose client (50+ KB)<br/>- Slower migration workflows<br/>- Use raw SQL with Supabase instead (faster iteration)<br/>- Add if you hit 50+ tables or need advanced queries |
| **Drizzle ORM** | - Better than Prisma but still overkill for MVP<br/>- Direct SQL is fine for the calls/leads/knowledge schema |
| **TypeORM** | - Enterprise ORM, not needed for this scale |

**Recommendation:** Use raw SQL with `@supabase/supabase-js` for MVP. The schema is simple (8 core tables). Raw SQL is faster to write and debug than ORMs. If you add 100+ tables or complex relationships, revisit this.

---

## Authentication & Secrets

| Tool | Purpose | Implementation |
|------|---------|-----------------|
| **Supabase Auth** | Admin login, JWT tokens | Use `@supabase/supabase-js` auth module<br/>Email/password for MVP<br/>OAuth (Phase 2) |
| **Environment Variables** | API keys, secrets | Store in Vercel project settings<br/>Use Next.js `.env.local` in dev<br/>Never commit `.env.local` |
| **Webhook Signing** | Verify Retell & Twilio requests | Retell sends `X-Retell-Signature` header<br/>Twilio sends URL parameters<br/>Verify in each webhook handler |

---

## Installation & Setup

### Core Dependencies

```bash
# Initialize Next.js project (if starting fresh)
npx create-next-app@latest ai-receptionist \
  --typescript \
  --tailwind \
  --app \
  --no-eslint \
  --src-dir

cd ai-receptionist

# Core dependencies
npm install \
  @supabase/supabase-js \
  zod \
  date-fns \
  react-hook-form \
  tailwindcss \
  @headlessui/react \
  lucide-react \
  pino \
  pino-pretty \
  dotenv

# SMS & notification
npm install twilio

# Dev dependencies
npm install -D \
  typescript \
  @types/node \
  @types/react \
  prettier
```

### Environment Variables (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...  # Backend only

# Retell AI
RETELL_API_KEY=key_...
RETELL_WEBHOOK_SECRET=secret_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Stripe (Phase 2)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App config
REVALIDATE_SECRET=random-secret-for-isr
NODE_ENV=development
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Framework** | Next.js 14 App Router | Remix | Remix is solid but overkill for this. Next.js is the standard for SaaS dashboards. |
| **Framework** | Next.js 14 App Router | Vue + Nuxt | Vue is great, but Next.js has better webhook/API handling. Stick with React ecosystem. |
| **Database** | Supabase (PostgreSQL) | Firebase | Firebase doesn't have RLS (multi-tenant safety). Supabase is better for B2B SaaS. |
| **Database** | Supabase (PostgreSQL) | MongoDB | Relational schema fits calls/leads perfectly. NoSQL adds complexity. |
| **Voice** | Retell AI | Twilio Programmable Voice | Twilio requires more setup and LLM integration. Retell is all-in-one. Simpler. |
| **Voice** | Retell AI | VoiceAI by Bland | Retell has better Claude integration. Bland is cheaper but less mature. |
| **Voice** | Retell AI | Vapi | Newer, good product, but less battle-tested. Retell is more stable. |
| **SMS** | Twilio | AWS SNS | Twilio is simpler. SNS requires more AWS expertise. |
| **Hosting** | Vercel | AWS Lambda + API Gateway | Vercel is easier for Next.js (zero config). AWS is more complex. |
| **Hosting** | Vercel | Netlify | Netlify is good, but Vercel has better Next.js integration. |
| **Styling** | Tailwind + Headless UI | Material-UI | Material-UI is heavier. Tailwind is faster for MVP. |
| **Forms** | React Hook Form | Formik | React Hook Form is lighter and faster. Formik is older. |
| **Logging** | Pino | Winston | Pino is newer and faster. Both are fine; choose one. |

---

## Version Recommendations (as of 2026-03-01)

| Technology | Recommended Version | Notes |
|------------|-------------------|-------|
| Node.js | 20.x LTS or 22.x | Vercel defaults to 20.x LTS. Use 20+ for native fetch. |
| Next.js | 14.x or 15.x | 14.x is stable. 15.x just released but cutting edge. Stick with 14.x for MVP. |
| React | 18.x (via Next.js) | Latest stable, built into Next.js. |
| TypeScript | 5.x | Latest stable. |
| Supabase | Latest managed version | Supabase updates are transparent; no version pinning needed. |
| Tailwind CSS | 3.x | Latest stable. |

---

## What NOT to Use

| Tool | Why Avoid |
|------|-----------|
| **Express.js** | Next.js API routes are sufficient. Extra framework adds complexity. |
| **Next.js Pages Router** | App Router is the new standard. Pages Router is legacy. Use App Router. |
| **Socket.io** | Supabase Realtime uses Postgres LISTEN/NOTIFY (built-in). Socket.io adds overhead. |
| **GraphQL** | REST API routes are simpler for webhooks. GraphQL adds complexity for this schema. |
| **Redux** | Server components + Supabase realtime eliminate need for Redux. Use React Context if needed. |
| **Passport.js** | Supabase auth is simpler. Passport is for complex multi-provider setups. |
| **NestJS** | Overkill for a single Next.js app. Use simple API routes. |
| **Docker for MVP** | Vercel handles containerization. Docker adds build complexity. Use later if needed. |
| **GraphQL subscriptions** | Supabase Realtime (Postgres LISTEN/NOTIFY) is simpler and faster. |
| **Celery/Bull** | Supabase Edge Functions handle background jobs (daily summaries, follow-ups). No extra queue needed for MVP. |

---

## Critical Integration Points

### 1. Retell AI Webhook Handler

```typescript
// app/api/webhooks/retell/route.ts
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { verifyRetellWebhook } from '@/lib/retell/verify';

const RetellEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('call_started'),
    call_id: z.string(),
    to_number: z.string(),
    from_number: z.string(),
  }),
  z.object({
    event: z.literal('call_ended'),
    call_id: z.string(),
    transcript: z.string(),
    duration_ms: z.number(),
    recording_url: z.string().optional(),
  }),
  // ... other events
]);

export async function POST(req: Request) {
  // 1. Verify webhook signature
  const signature = req.headers.get('x-retell-signature');
  const body = await req.text();

  if (!verifyRetellWebhook(body, signature!)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse and validate payload
  const event = RetellEventSchema.parse(JSON.parse(body));

  // 3. Handle event (upsert to Supabase)
  // ... implementation

  return Response.json({ received: true });
}
```

**Key libraries:**
- `zod` for validation
- `@supabase/supabase-js` for database writes
- No heavy webhook verification library needed; implement simple HMAC check

### 2. SMS Inbound Handler

```typescript
// app/api/webhooks/sms-inbound/route.ts
import twilio from 'twilio';
import { supabase } from '@/lib/supabase/server';
import { parseOwnerCommand } from '@/lib/notifications/commands';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: Request) {
  // 1. Verify Twilio signature
  const signature = req.headers.get('X-Twilio-Signature') || '';
  // ... verify using twilio.validateRequest()

  // 2. Parse form data
  const formData = await req.formData();
  const from = formData.get('From') as string;
  const body = formData.get('Body') as string;

  // 3. Find client and parse command
  const client = await supabase
    .from('clients')
    .select('*')
    .eq('owner_phone', from)
    .single();

  const command = parseOwnerCommand(body);

  // 4. Execute command (mark lead as contacted, booked, etc.)
  // ... implementation

  // Twilio response
  return new Response('<?xml version="1.0"?><Response></Response>', {
    headers: { 'Content-Type': 'application/xml' },
  });
}
```

**Key libraries:**
- `twilio` SDK for validation and sending replies

### 3. Realtime Dashboard Updates

```typescript
// app/(dashboard)/calls/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Call } from '@/types/database';

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    // Initial load
    const fetchCalls = async () => {
      const { data } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });
      setCalls(data || []);
    };

    fetchCalls();

    // Subscribe to realtime updates
    const subscription = supabase
      .from('calls')
      .on('*', (payload) => {
        // Handle insert, update, delete
        if (payload.eventType === 'INSERT') {
          setCalls((prev) => [payload.new as Call, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, []);

  return (
    <div className="space-y-4">
      {calls.map((call) => (
        <CallCard key={call.id} call={call} />
      ))}
    </div>
  );
}
```

**Key libraries:**
- `@supabase/supabase-js` for realtime subscriptions

---

## Performance Considerations

| Concern | Recommendation |
|---------|-----------------|
| **Bundle Size** | - Use dynamic imports for heavy modals<br/>- Tree-shake unused Lucide icons<br/>- Target <100KB JS for dashboard initial load |
| **Database Queries** | - Use indexes on `client_id`, `created_at`, `status`<br/>- Avoid N+1 queries; use `.select('*, clients(*)')` in Supabase<br/>- Cache call analytics in a separate summary table (Phase 2) |
| **Realtime Updates** | - Limit realtime subscriptions to visible tables only<br/>- Use debouncing for rapid updates<br/>- Consider polling instead of websockets for low-update-frequency pages |
| **API Routes** | - Use serverless Edge Functions for lightweight webhooks<br/>- Standard API routes for complex logic<br/>- Timeout all external API calls (Retell, Twilio) at 10s |
| **Image Optimization** | - Use Next.js Image component with placeholders<br/>- Not critical for MVP (minimal images) |

---

## Monitoring & Observability

| Tool | Purpose | For Phase |
|------|---------|-----------|
| **Vercel Analytics** | Built-in dashboard performance monitoring | MVP |
| **Sentry** | Error tracking and alerting | Phase 2 (add when live with Interstate Tires) |
| **LogRocket** | Session replay and debugging | Phase 2 (optional) |
| **Supabase Logs** | Database and Edge Function logs | Available from day 1, check Supabase dashboard |

For MVP: Use Vercel's built-in analytics + Supabase logs. Add Sentry once you have traffic.

---

## Database Scaling Notes

| Scale | Approach |
|-------|----------|
| **MVP (1-10 clients)** | Shared Supabase project, 0 schema changes. Raw SQL queries. |
| **10-100 clients** | RLS policies proven. Add caching layer (Vercel KV, Redis) for analytics (Phase 2). |
| **100-1000 clients** | Consider moving to dedicated Supabase project. Index on `(client_id, created_at)` critical. |
| **1000+ clients** | Partition calls table by month. Move analytics to separate OLAP pipeline. Hire database engineer. |

For MVP: Don't optimize prematurely. Supabase handles up to 100 concurrent connections easily.

---

## Summary Table: What to Install Today

```bash
npm install @supabase/supabase-js zod date-fns react-hook-form tailwindcss @headlessui/react lucide-react pino dotenv twilio

npm install -D typescript @types/node @types/react prettier
```

**Total bundle impact:** ~200 KB gzipped (acceptable for SaaS dashboard).

---

## Sources & Validation

| Technology | Source | Confidence |
|-----------|--------|------------|
| Next.js 14 App Router | CLAUDE.md (project instructions) + industry standard for SaaS dashboards | HIGH |
| Supabase | CLAUDE.md + PostgreSQL/JWT proven at scale | HIGH |
| Retell AI | CLAUDE.md + official Retell docs for pricing/features | HIGH |
| Twilio SMS | CLAUDE.md + industry standard for SMS delivery | HIGH |
| Vercel | CLAUDE.md + native Next.js integration | HIGH |
| Supporting libraries | 2025 ecosystem conventions + npm popularity metrics | MEDIUM |

**Note:** All core tech stack decisions are already made in CLAUDE.md. This research validates and adds supporting libraries for the implementation phase.

---

## Next Steps

1. **Phase 1 (Build):** Install dependencies listed above and create initial Next.js project structure
2. **Phase 2 (Integrate):** Set up Retell AI, Supabase, and Twilio accounts with credentials
3. **Phase 3 (Test):** Load Interstate Tires knowledge base and run test calls through full webhook pipeline
4. **Phase 2+ (Optimize):** Add monitoring, caching, and analytics as needed

---

**Last Updated:** 2026-03-01
**Next Review:** After first 50 calls with Interstate Tires (validate webhook reliability and performance)
