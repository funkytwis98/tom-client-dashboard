# AI Phone Receptionist

## What This Is

A B2B SaaS product that gives small businesses an AI-powered phone receptionist. Each client gets a dedicated phone number answered by a custom AI agent trained on their business, real-time SMS updates to the owner, lead capture, and a management dashboard. First client is Interstate Tires in Chattanooga, TN.

## Core Value

When a customer calls a client's business, an AI answers with business-specific knowledge, handles the conversation professionally, captures lead information, and immediately texts the owner with a summary — so no call goes unanswered and no lead is lost.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] AI answers inbound calls with client-specific knowledge (services, pricing, hours, FAQs)
- [ ] Every call is logged with transcript, duration, recording, and AI-generated summary
- [ ] Owner receives SMS notification after each call with caller info and lead score
- [ ] Owner can text back commands (call back, not interested, booked) to update lead status
- [ ] Leads are automatically extracted from calls with name, phone, service interest, urgency
- [ ] Dashboard shows call logs with search/filter and full call detail view
- [ ] Dashboard shows leads with status tracking (new, contacted, booked, completed, lost)
- [ ] Knowledge base editor for managing business info the AI uses per client
- [ ] Client management for adding/editing business clients
- [ ] Basic analytics (calls today, leads this week, avg call duration)
- [ ] AI agent personality, greeting, and sales style configurable per client
- [ ] After-hours handling with voicemail message
- [ ] Escalation rules for when to defer to the owner
- [ ] Supabase auth for admin access with RLS-enforced multi-tenancy

### Out of Scope

- Client website — deferred to after first client is live
- Outbound follow-up calls — Phase 2
- Sales playbook system — Phase 2
- Client self-service dashboard — Phase 2
- Advanced analytics (conversion funnels, heatmaps) — Phase 2
- Custom domains per client — Phase 2
- Stripe billing integration — after second client
- Tom/OpenClaw integration — Phase 3
- OAuth/magic link login — email/password sufficient for MVP
- Mobile app — web-first

## Context

- **First client:** Interstate Tires, Chattanooga, TN — tire shop, walk-ins and appointments
- **Differentiator:** Full-stack offering (phone + notifications + dashboard) where the owner stays in control via simple text commands, not a black box
- **Revenue model:** $299-$799/mo per client, ~$97/mo cost per client, ~$200 profit at starter tier
- **Retell AI** provides voice/telephony with sub-800ms latency, Claude LLM integration, webhook-based call events, and built-in call analysis
- **The owner notification layer is the secret weapon** — makes it feel like a real employee reporting to them

## Constraints

- **Tech stack:** Next.js 14+ (App Router), Supabase, Retell AI, Twilio SMS, Vercel — all decided
- **Architecture:** Single Next.js app for MVP (not monorepo) — ship fast, split later
- **External accounts needed:** Supabase project, Retell AI account + phone number, Twilio account — all need to be created during build
- **Retell pricing:** ~$0.14/min with Claude LLM, 60 free minutes to start
- **Goal:** Ship MVP as fast as possible, iterate based on real calls with Interstate Tires

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single Next.js app over monorepo | Faster to ship, can split later when client-site is needed | — Pending |
| Core 5 features first, website deferred | Get first client live faster, validate the phone+SMS loop first | — Pending |
| Retell AI over alternatives | All-inclusive pricing, native SMS, sub-800ms latency, Claude integration, SOC2/HIPAA | — Pending |
| Supabase for backend | Auth, RLS, realtime subscriptions, edge functions — all-in-one | — Pending |
| Subdomain routing for client sites (when built) | Simpler than custom domains, no DNS per client | — Pending |

---
*Last updated: 2026-03-01 after initialization*
