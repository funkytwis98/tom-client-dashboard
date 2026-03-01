# Project Research Summary

**Project:** AI Phone Receptionist B2B SaaS
**Domain:** Voice AI service for small business phone answering
**Researched:** 2026-03-01
**Overall Confidence:** HIGH

---

## Executive Summary

The AI Phone Receptionist is a B2B SaaS that replaces small business phone answering systems with a custom AI agent powered by Claude LLM and Retell AI. The research validates the stack (Next.js 14, Supabase, Retell AI, Twilio SMS, Vercel) as optimal for this domain and confirms the MVP feature set is well-scoped and achievable in 3-4 weeks of focused development.

The recommended approach prioritizes webhook reliability and owner notification fidelity above all else. Unlike generic voice AI products, the secret sauce is bidirectional SMS communication that makes owners feel in control—not a black box. The highest risks are silent call failures (calls look successful but failed), knowledge base sync problems (AI and reality diverge), and broken notification loops (SMS doesn't arrive or owner commands aren't understood). All are addressable in Phase 1 with proper engineering discipline.

Build sequence: foundation (Supabase + Retell integration) → call handling pipeline (webhooks + lead extraction) → owner notifications (SMS + command parsing) → dashboard visibility → enhancement. Ship the call loop first; dashboard polish comes after MVP validation with Interstate Tires.

---

## Key Findings

### Recommended Stack

The research validates the technology decisions already documented in CLAUDE.md. **Core stack is low-risk and well-integrated:**

**Framework & Deployment:**
- **Next.js 14+ (App Router)** — Dashboard + API routes + webhooks. Vercel integration eliminates deployment friction. Server components reduce bundle size. Proven for B2B SaaS.
- **Vercel** — Native Next.js hosting, serverless functions auto-scale, environment management built-in.

**Real-Time & Data:**
- **Supabase (PostgreSQL)** — Multi-tenant foundation with Row-Level Security (RLS) for data isolation. Realtime subscriptions enable live dashboard updates. Edge Functions handle background jobs. pgvector support for future RAG implementation.
- **@supabase/supabase-js** — Official SDK with type generation, realtime, and auth built-in.

**Voice & Notifications:**
- **Retell AI** — $0.07-$0.14/min all-inclusive with native Claude integration, sub-800ms latency, built-in call transcription + analysis, webhook event streaming. No alternative is as complete.
- **Twilio SMS (or Retell native SMS)** — Reliable SMS delivery for owner notifications. Start with Twilio for MVP, potentially consolidate to Retell's native SMS in Phase 2.

**Supporting Libraries:**
- **zod** — Schema validation for webhook payloads (critical for data integrity).
- **date-fns**, **react-hook-form**, **tailwindcss**, **headlessui**, **lucide-react** — Standard SaaS dashboard tooling.
- **pino** — Structured logging for debugging webhook events.

**What NOT to use:** ORM (Prisma/Drizzle), Express.js, GraphQL, Socket.io, NestJS, Docker for MVP. Raw SQL with Supabase is faster to iterate on the simple schema (8 core tables).

**Version targets (as of 2026-03-01):** Node.js 20.x LTS, Next.js 14.x, React 18.x, TypeScript 5.x, Supabase latest managed version.

See **STACK.md** for detailed rationale, alternatives considered, and bundle size analysis.

### Expected Features

Research confirms MVP feature set is tight and well-prioritized:

**Must Have (Table Stakes) — 11 features required at launch:**
1. Inbound call answering (AI + Claude)
2. Call logging + transcription
3. Business-specific knowledge base
4. Caller information extraction → leads
5. Owner SMS notifications (real-time)
6. Dashboard overview (calls, leads, metrics)
7. Lead status tracking (new → contacted → booked → completed/lost)
8. Knowledge base editor UI
9. AI personality/voice selection
10. Multi-client/tenant support
11. After-hours handling

All 11 can be built in 80-120 dev hours (3-4 weeks).

**Should Have (Differentiators) — worth implementing in Phase 1 for product feel:**
- SMS command parsing ("call back" → status update)
- Lead scoring (1-10 urgency)
- Simple analytics (calls/leads/duration trends)
- Daily summary SMS

**Defer to Phase 2+:**
- Outbound follow-up calls
- Sales playbook system
- Client website
- Client self-service dashboard
- Advanced analytics
- Custom domains, team accounts, integrations

See **FEATURES.md** for complete feature landscape, complexity estimates, and launch phases.

### Architecture Approach

**System design is event-driven and multi-tenant:**

Calls flow through a webhook pipeline: Retell receives call → Claude processes conversation → Retell sends call_ended webhook → Next.js processes webhook → call stored in Supabase → lead extracted (async) → owner notified via SMS → dashboard updates in real-time.

Owner replies via SMS: Owner texts "call back" → Twilio webhook → command parser → lead status updated → dashboard reflects change.

**Key architectural patterns:**
1. **Webhook-driven:** External events trigger database updates. Return 200 OK immediately; offload heavy work to async jobs.
2. **Dynamic prompt injection:** AI agent's system prompt is built from database at runtime, not hardcoded.
3. **Real-time subscriptions:** Dashboard subscribes to Supabase tables; Postgres LISTEN/NOTIFY pushes updates instantly.
4. **Multi-tenant data scoping:** All data queries filtered by `client_id`; RLS policies enforce at database level.
5. **Async lead analysis:** Call ends → transcript saved immediately → Claude analyzes separately.
6. **Webhook signature validation:** Retell and Twilio requests verified before trusting payload data.

**Build order implications:**
1. Supabase schema + auth (foundation)
2. Retell integration + call webhook handler (data ingestion)
3. Lead extraction + owner notifications (core business logic)
4. Dashboard skeleton (get data visible)
5. Knowledge base editor (UI for AI control)

See **ARCHITECTURE.md** for component boundaries, data flow diagrams, scalability considerations, and anti-patterns to avoid.

### Critical Pitfalls

The research identifies 8 critical/moderate pitfalls that would cause rewrites or lost customers if missed:

**1. Silent Call Failures** — Calls appear successful in Retell but AI didn't actually handle them properly.
   - Prevention: Validate knowledge base in webhook. Health check calls daily. Knowledge base versioning.

**2. Knowledge Base Context Window Exhaustion** — AI system prompt grows too large, latency increases, AI becomes verbose and confused.
   - Prevention: Context budget indicator in editor. Force prioritization. Chunking strategy. Regular audits.

**3. Broken Owner Notification Loop** — SMS doesn't arrive or owner replies aren't parsed correctly.
   - Prevention: Delivery confirmation. Robust command parser. Two-way confirmation SMS. Rate limiting. Onboarding test.

**4. Escalation Requests Stuck** — Urgent issues stuck in limbo, owner callback never happens.
   - Prevention: Escalation flag + priority. Context extraction. Callback deadline with reminder. Escalation dashboard tab.

**5. Data Loss on Webhook Failures** — Call happens but zero trace in database.
   - Prevention: Idempotent webhook handler. Webhook signature validation. Transactional processing. Failed webhook queue.

**6. Knowledge Base Out of Sync With Reality** — Owner changes pricing/hours but AI still quotes old info.
   - Prevention: Source of truth linking. Staleness indicator. Change log. Testing workflow. Scheduled validation.

**7. Owner Gets Overwhelmed** — 30+ SMS per day → owner disables notifications → leads not followed up.
   - Prevention: Smart batching defaults. Quiet hours. Lead score threshold. Dashboard visual emphasis. Onboarding calibration.

**8. Call Quality Degrades Unnoticed** — AI starts repeating itself, misunderstanding, getting stuck in loops.
   - Prevention: Per-call quality score. Auto-review of poor calls. Trend detection. Knowledge base conflict detection. Sentiment-triggered review.

See **PITFALLS.md** for detailed prevention strategies, detection methods, and phase-specific warnings.

---

## Implications for Roadmap

### Suggested Phase Structure

Based on dependencies, architecture patterns, and pitfall prevention:

### Phase 1: MVP — Call Loop & Owner Control (3-4 weeks)

**Rationale:** Must establish core loop (call → notification → owner action) before any dashboard feature matters. This is the table stakes. Addresses pitfalls 1, 3, 4, 5, 6 early via engineering discipline.

**Delivers:**
- Functional AI receptionist answering calls for Interstate Tires
- Every call logged, transcribed, stored
- Caller info extracted → leads created
- Owner gets SMS notification within 10 seconds of call end
- Owner can text back commands ("call back", "booked", etc.)
- Basic dashboard (home, calls, leads, knowledge base editor)
- AI personality + voice configurable per client
- After-hours voicemail
- Lead status tracking (new → contacted → booked → completed/lost)
- Lead scoring (simple heuristic)
- Daily summary SMS

**Features (from FEATURES.md Tier 1-3):**
- All 11 table stakes
- SMS command parsing (differentiator)
- Lead scoring
- Knowledge base editor
- AI personality/voice selection
- After-hours handling
- Multi-tenancy (admin interface)

**Tech Stack (from STACK.md):**
- Next.js 14 App Router, Supabase, Retell AI, Twilio SMS, Vercel
- zod, react-hook-form, tailwindcss, pino
- Raw SQL (no ORM)

**Architecture (from ARCHITECTURE.md):**
- Webhook-driven pipeline (call_ended → Supabase → lead extraction → SMS notification)
- Dynamic prompt injection (knowledge base → agent config at runtime)
- Multi-tenant RLS policies
- Async lead analysis (don't block webhook)
- Realtime dashboard via Supabase subscriptions

**Pitfall Prevention in Phase 1:**
- Webhook idempotency + signature validation (Pitfall 5)
- Knowledge base context budget UI (Pitfall 2)
- SMS delivery confirmation + robust command parsing + two-way confirmation (Pitfall 3)
- Escalation flagging with priority (Pitfall 4)
- Call quality scoring + sentiment flags (Pitfall 8)
- Staleness indicators on knowledge base (Pitfall 6)
- Smart batching + quiet hours + notification threshold (Pitfall 7)
- Health check calls + knowledge base versioning (Pitfall 1)

**Build Order (MVP Sub-Phases):**
1. **Foundation (Days 1-2):** Next.js project, Supabase schema + auth, dashboard skeleton
2. **Retell Integration (Days 3-5):** Phone number, AI agent, webhook handler for call_started/call_ended
3. **Owner Notifications (Days 6-7):** SMS via Twilio, inbound SMS webhook, command parsing
4. **Dashboard (Days 8-12):** Call log, leads, knowledge base editor CRUD, basic stats
5. **Agent Tuning (Days 13-15):** Load Interstate Tires knowledge base, personality config, voice selection
6. **Testing with Interstate Tires (Days 16-20):** 50+ test calls, prompt tuning, quality validation

**Success Criteria:**
- Interstate Tires owner receives SMS within 10 sec of call ending
- Owner can text "call back" and system updates lead status
- Dashboard shows all calls with transcripts, sentiments, lead scores
- 50+ test calls with quality score ≥ 6/10
- Zero silent call failures

**Research Flag:**
- **Webhook reliability needs validation** — Implement failed webhook queue and retry logic early. Test with Retell sandbox before Interstate Tires production calls.
- **Twilio SMS delivery latency** — Plan to instrument and monitor during Interstate Tires validation. Carrier delays vary.
- **Interstate Tires knowledge base scope** — Schedule onboarding call before Phase 1 development to document exact requirements.

---

### Phase 2: Sales & Visibility (4-6 weeks, after Phase 1 validated)

**Rationale:** Once core loop is proven, add revenue-impact features (outbound calls, playbooks) and full-stack offering (website). Phase 1 must be rock-solid for 2+ weeks first.

**Delivers:**
- Outbound follow-up calls (auto-callback on missed leads)
- Sales playbook system (per-client conversation scripts, objection handling)
- Client website (included in package, pulls from knowledge base)
- Website booking integration (optional Cal.com)
- Conversation analytics (sentiment, objection triggers, performance)
- Client self-service dashboard (client can log in, see their own data)
- Advanced analytics (conversion funnel, peak hours, lead-to-booking tracking)
- Custom domains for websites

---

### Phase 3: Tom Integration & Scaling (6-8 weeks, 2026-Q3+)

**Rationale:** After receptionist is proven and scaling (10+ clients), integrate as module into OpenClaw/Tom framework. Not before product is stable and differentiated standalone.

**Delivers:**
- Tom/OpenClaw unified dashboard (phone + social + website in one place)
- Cross-channel insights (social engagement → phone calls → conversions)
- Live call coaching
- Multi-business accounts
- Agency portal
- White-label option
- Advanced CRM integrations
- Multilingual agent support

---

## Phase Ordering Rationale

1. **Phase 1 must ship first and be rock-solid.** The call loop is foundational; everything else depends on it. No feature matters if calls don't answer or owner notifications fail.

2. **Webhook reliability and owner notification fidelity are non-negotiable.** These are higher priority than dashboard polish. A perfect dashboard with broken SMS is worse than a basic dashboard with reliable notifications.

3. **Multi-tenancy must be built into Phase 1, not bolted on later.** RLS policies, `client_id` filtering, and data isolation are harder to retrofit. Do it from day one.

4. **Knowledge base editor is critical for Phase 1 product feel.** Owner must be able to update AI behavior without your engineering help. This builds trust and reduces support burden.

5. **Phase 2 (outbound + sales playbooks) only makes sense after Phase 1 is proven.** These features are high-complexity, high-ROI, but not table stakes. Validate the core loop first.

6. **Tom integration comes in Phase 3.** Don't integrate prematurely. Receptionist should be a standalone, differentiated product first. Integration is an enhancement, not a requirement.

---

## Research Flags

**Phases needing deeper research during planning:**

- **Phase 1 — Retell AI webhook reliability:** Research Retell's webhook retry behavior, timeout values, and failure modes. Test in sandbox before production.

- **Phase 1 — Twilio SMS delivery under load:** Research SMS delivery times and carrier delays. Plan to instrument and monitor during Interstate Tires validation.

- **Phase 2 — Outbound call quality at scale:** Retell outbound calling is less documented than inbound. Need to research call detection, callback timing, and quality degradation.

- **Phase 2 — RAG for large knowledge bases:** If knowledge bases grow >20KB, RAG (retrieval-augmented generation) will be needed. Requires vector embeddings. Defer research until Phase 2.

**Phases with standard patterns (skip research-phase during planning):**

- **Phase 1 — Dashboard UI:** CRUD pages, filtering, search. Well-established patterns. Use Tailwind + headlessui, no special research needed.

- **Phase 1 — Supabase auth & multi-tenancy:** Documented in CLAUDE.md. RLS patterns are standard.

- **Phase 1 — Real-time subscriptions:** Supabase realtime is built-in. Standard pattern.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | All core decisions already made in CLAUDE.md. Validation through industry consensus (Next.js for SaaS, Supabase for multi-tenant, Retell for voice). No viable alternatives identified. |
| **Features** | HIGH | MVP feature set directly from CLAUDE.md. Table stakes and differentiators align with voice AI market patterns. Feature complexity estimates validated through typical SaaS delivery. |
| **Architecture** | HIGH | Event-driven webhook pipeline is industry standard for voice APIs. Multi-tenant RLS patterns well-documented in Supabase. No exotic patterns. |
| **Pitfalls** | MEDIUM-HIGH | Critical pitfalls (silent failures, notification loop, data loss) extrapolated from voice API best practices + SaaS failure patterns. Pitfalls 1-5 confidence HIGH (prevent via standard engineering). Pitfalls 6-8 confidence MEDIUM (need validation with Interstate Tires real usage). |

**Overall Confidence: HIGH**

Research validated core strategy, stack, and MVP scope. Ready to proceed to requirements definition and roadmap planning.

---

## Gaps to Address

**During Phase 1 Planning:**

1. **Retell webhook timeout behavior** — CLAUDE.md doesn't specify Retell's webhook timeout or retry strategy. Need to research in Retell docs before building failed webhook queue.

2. **Interstate Tires knowledge base scope** — CLAUDE.md says "load Interstate Tires knowledge base" but doesn't detail what that includes (how many entries, how detailed).

3. **Owner notification frequency sweet spot** — Pitfall 7 (owner overwhelm) is prevented by "smart batching defaults" but we don't know the right defaults without data.

4. **Call quality score formula** — Pitfall 8 suggests a composite quality score, but the weights are estimated.

**During Phase 2 Planning:**

5. **Outbound call answer detection** — How to know if outbound call was answered vs. voicemail vs. rejected? Retell docs unclear on this.

6. **RAG embedding strategy** — If knowledge bases grow large, need vector embeddings. Should we use OpenAI, Hugging Face, or another provider?

---

## Sources

### Primary (HIGH Confidence)
- **CLAUDE.md** — Official project instructions defining MVP, tech stack, database schema, webhooks, business model.
- **STACK.md** (this research) — Technology selection rationale, version recommendations, supporting libraries, performance considerations.
- **FEATURES.md** (this research) — Feature landscape, table stakes vs. differentiators, MVP scope, complexity estimates.
- **ARCHITECTURE.md** (this research) — Event-driven patterns, component boundaries, data flow, scalability.
- **PITFALLS.md** (this research) — Domain-specific failure modes, prevention strategies, phase-specific warnings.

### Secondary (MEDIUM Confidence)
- Voice AI market knowledge (training data) — Retell AI positioning, competitive landscape, small business SaaS patterns.
- Standard voice API architecture patterns (training data) — Webhook-driven, event-sourced patterns used by Twilio, Retell, OpenAI Realtime.

### Tertiary (LOW Confidence, Needs Validation)
- **Retell AI specific webhook behavior** — Assumed to follow standard webhook patterns. Needs verification in Retell docs.
- **Twilio SMS delivery times** — Assumed 10-30 second delivery. Varies by carrier and network load.
- **Interstate Tires typical call volume** — Unknown. Planning assumes 50+ calls during validation; actual TBD.
- **Context window impact on Claude LLM** — Assumed 8K-16K token context sufficient for typical knowledge base. Needs benchmarking during Phase 1.

---

**Research completed:** 2026-03-01
**Ready for roadmap:** YES
**Next step:** Proceed to requirements definition using Phase 1 feature list as starting point
