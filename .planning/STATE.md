# Project State — AI Phone Receptionist

**Last Updated:** 2026-03-01 (Roadmap created)
**Milestone:** v1 (MVP)

---

## Project Reference

**Core Value:** When a customer calls a small business, an AI answers with business-specific knowledge, captures lead info, and notifies the owner — so no call goes unanswered and no lead is lost.

**Business Model:** B2B SaaS at $299-$799/mo per client (~$97/mo cost, ~$200+ profit at starter tier). First client: Interstate Tires, Chattanooga, TN.

**Tech Stack:** Next.js 14+ (App Router), Supabase (PostgreSQL + auth + realtime), Retell AI (voice + Claude), Twilio SMS, Vercel.

**Key Differentiator:** Full-stack offering (phone + SMS notifications + dashboard) where owner stays in control via simple text commands, not a black box.

---

## Current Position

**Roadmap Status:** ✓ Complete (Phase 1 identified)
**Phase:** 1 / 1 (Inbound Call Loop & Owner Control)
**Sub-phase:** Foundation (Days 1-2 planned)
**Progress:** 0% (Ready to begin planning)

**Next Action:** `/gsd:plan-phase 1` to break Phase 1 into executable work plans.

---

## Requirements Status

**Total v1 requirements:** 15
**Mapped:** 15 (100% coverage)
**Unmapped:** 0

**Requirement Categories:**
- Call Handling (CALL-01, 02, 03): 3 → Phase 1
- Lead Management (LEAD-01, 02, 03): 3 → Phase 1
- Owner Notifications (NOTF-01, 02): 2 → Phase 1
- Dashboard (DASH-01, 02, 03, 04): 4 → Phase 1
- AI Agent Config (AGNT-01, 02, 03): 3 → Phase 1

---

## Phase 1 Goals (Reference)

**Deliver:** Functional AI receptionist answering calls with client-specific knowledge, logging conversations, capturing leads, and notifying owner in real-time.

**Sub-Phases (research suggested):**
1. **Foundation (Days 1-2):** Next.js project, Supabase schema + auth, dashboard skeleton
2. **Retell Integration (Days 3-5):** Phone number, AI agent, webhook handlers (call_started/call_ended)
3. **Owner Notifications (Days 6-7):** SMS via Twilio, inbound SMS webhook, command parsing
4. **Dashboard (Days 8-12):** Call log, leads, knowledge base editor, basic analytics
5. **Agent Tuning (Days 13-15):** Interstate Tires knowledge base, personality config, voice selection
6. **Testing with Interstate Tires (Days 16-20):** 50+ test calls, prompt refinement, quality validation

**Success Criteria (10 observable behaviors):**
1. Calls answered by AI with business-specific knowledge
2. Full transcript + recording stored and retrievable
3. Owner SMS within 10 sec of call ending
4. Owner can text commands to update lead status
5. Leads extracted with score and urgency
6. Dashboard shows searchable call log with transcripts
7. Leads pipeline visible with status tracking
8. Knowledge base editor lets admin update AI training data
9. AI personality/voice configurable per client
10. After-hours calls logged as voicemail

---

## Key Decisions (Locked)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Single Next.js app (not monorepo) | Faster to ship MVP, split later when client-site needed | ✓ Locked |
| Core call loop first, website deferred | Validate inbound + SMS before complexity | ✓ Locked |
| Retell AI + Claude | All-inclusive, sub-800ms latency, native SMS, SOC2 | ✓ Locked |
| Supabase backend | Auth, RLS, realtime, edge functions | ✓ Locked |
| Email/password auth (no OAuth) | Sufficient for MVP, admin-only initially | ✓ Locked |

---

## Critical Pitfalls (from Research)

**Phase 1 risks to prevent:**

1. **Silent call failures** — Calls appear successful but AI failed. Prevent: Webhook signature validation, health checks, knowledge base versioning.

2. **Knowledge base context exhaustion** — AI system prompt grows too large, becomes confused. Prevent: Context budget UI, force prioritization.

3. **Broken owner notification loop** — SMS doesn't arrive or owner replies aren't parsed. Prevent: Delivery confirmation, robust command parser, two-way confirmation SMS.

4. **Escalation stuck** — Urgent issues ignored. Prevent: Escalation flags with priority, callback deadline with reminders.

5. **Data loss on webhook failure** — Call happens but zero trace in database. Prevent: Idempotent webhook handler, signature validation, transactional processing.

6. **Knowledge base out of sync** — Owner changes pricing/hours but AI quotes old info. Prevent: Source of truth linking, staleness indicator, change log.

7. **Owner overwhelmed by SMS** — 30+ messages/day → notifications disabled. Prevent: Smart batching, quiet hours, lead score threshold.

8. **Call quality degrades unnoticed** — AI starts repeating/confused. Prevent: Per-call quality score, auto-review of poor calls, trend detection.

---

## Performance Metrics (to track)

**During Phase 1 development:**
- Webhook latency (Retell → Supabase)
- SMS delivery time (call end → owner SMS)
- Dashboard page load time
- Knowledge base context tokens used
- Call quality score distribution

**During Interstate Tires validation (Phase 1 final):**
- Call completion rate (% answered vs. missed)
- Lead extraction accuracy (name/phone/intent extracted)
- Owner SMS delivery success rate
- Owner command parsing success rate
- AI quality score (target ≥ 6/10)

---

## Accumulated Context

### Research Flags (monitor during planning)

1. **Retell webhook reliability** — Verify Retell's webhook retry behavior, timeout values. Test in sandbox before Interstate Tires production.
2. **Twilio SMS delivery latency** — Carrier delays vary. Instrument and monitor during Interstate Tires validation.
3. **Interstate Tires knowledge base scope** — Schedule onboarding call to detail exact requirements (service list, pricing structure, FAQ volume).
4. **Context window impact** — Validate 8K-16K token context sufficient for typical knowledge base during Phase 1.

### Todos (blocking planning)

- [ ] Schedule onboarding call with Interstate Tires to document knowledge base requirements
- [ ] Create Supabase project and configure RLS policies
- [ ] Create Retell AI account and reserve phone number
- [ ] Create Twilio account for SMS
- [ ] Set up Vercel project and environment variables

### Blockers

None at roadmap stage. Ready to proceed to Phase 1 planning.

---

## Session Continuity

**Roadmap created by:** GSD Roadmapper
**Roadmap date:** 2026-03-01
**User:** Secretaria (solo developer + Claude)
**Next phase:** `/gsd:plan-phase 1` to break Phase 1 into executable work plans

**Files created:**
- .planning/ROADMAP.md (phase structure, success criteria, requirements mapping)
- .planning/STATE.md (this file, project memory)
- .planning/REQUIREMENTS.md (traceability updated)

**Continuation note:** All requirements locked to Phase 1. When `/gsd:plan-phase` is called, it will decompose Phase 1 into detailed work plans (foundational setup → integration → notifications → dashboard → agent tuning → validation).

---

*State initialized: 2026-03-01*
