# Feature Landscape: AI Phone Receptionist for Small Businesses

**Domain:** B2B SaaS — AI-powered phone receptionist
**First Client:** Interstate Tires (Chattanooga, TN)
**Researched:** 2026-03-01
**Confidence:** MEDIUM (drawn from CLAUDE.md project instructions, product positioning, and training knowledge of AI voice market)

---

## Table Stakes

Features users expect and will abandon the product if missing. These define the baseline for a viable AI receptionist product.

| Feature | Why Expected | Complexity | MVP? | Notes |
|---------|--------------|------------|------|-------|
| **Inbound call answering** | Core function — business needs phone calls answered | High | YES | Uses Retell AI + Claude LLM. Must handle natural conversation, not robotic IVR. |
| **Call logging and transcription** | Legal/operational requirement; users need records | High | YES | Every call must be recorded, transcribed, and searchable. |
| **Business-specific knowledge** | AI must know services, pricing, hours, FAQs | Medium | YES | Knowledge base system — AI is worthless if it can't answer basic questions. |
| **Caller information capture** | Leads are useless without name, phone, intent | Medium | YES | Name, phone number, service interest, urgency extracted automatically. |
| **Owner notifications** | Business owner must know when calls come in | High | YES | SMS/text updates so owner doesn't miss important leads. This is the "stay in control" differentiator. |
| **Dashboard/management interface** | Can't manage what you can't see | High | YES | View calls, leads, and manage business info. Must be intuitive for non-technical owners. |
| **Lead status tracking** | Sales pipeline visibility (new → contacted → booked → completed) | Medium | YES | Basic CRM functionality so owner knows next steps. |
| **Call quality audio** | Poor audio = calls get dropped, frustrated callers | High | Dependency | Retell AI's latency (<800ms) and voice quality are critical. |
| **AI personality/voice selection** | Each business is different; generic AI feels wrong | Medium | YES | Agent name, greeting, tone, voice selection per client. |
| **After-hours handling** | Businesses aren't always open; callers expect voicemail | Medium | YES | Voicemail message, after-hours detection, don't answer if closed. |
| **Multi-client/tenant support** | B2B SaaS = must serve multiple businesses from one system | High | YES | Complete data isolation, separate configurations per client. |
| **Security & compliance** | Small businesses care about data privacy, liability | High | Phase 2 | SOC 2 attestation, HIPAA compliance (Retell AI provides these). Start with basic security, add attestations later. |

**MVP Threshold:** 11/13 features needed at launch. Owner notifications and call answering are non-negotiable. Basic dashboard is minimum viable.

---

## Differentiators

Features that set this product apart from competitors and create competitive moat. These are "nice-to-haves" that become "must-haves" once customers experience them.

| Feature | Value Proposition | Complexity | Phase | Notes |
|---------|-------------------|------------|-------|-------|
| **Owner SMS command parsing** | Owner texts "call back" or "offer 10% off" → system acts on it. Feels like a real employee. | Medium | 1 | Differentiator from generic voice answering. Shows owner is in control, not automation running them. |
| **Real-time SMS notifications** | Not next-day summary, not dashboard polling. Text within 10 seconds of call end. | Medium | 1 | Creates sense of being "in control." Owner can respond immediately. Most competitors only have email summaries. |
| **Call quality and interruption handling** | AI can interrupt and be interrupted naturally, sounds human | High | Dependency | Retell AI's sub-800ms latency is a moat. Competitors with 1-2s latency feel robotic. |
| **Sales-trained conversation flow** | AI doesn't just answer questions; it asks qualifying questions, offers upsells, creates urgency | High | 1 | Not "IVR mode" (press 1 for sales). Real consultative sales conversation. Differentiator from generic voice assistants. |
| **Dynamic knowledge base UI** | Easy editor to add/update business info without technical help | Medium | 1 | If owners can't update info themselves, product feels heavy. Competitors make this hard. |
| **Full-stack offering** | Phone + website + dashboard all included, not point solutions | High | 2 | Website auto-updates from knowledge base. No fragmented tools. Differentiator from pure voice answering services. |
| **Outbound follow-up calls** | AI proactively calls back leads who didn't book. No human needed. | High | 2 | Most competitors only handle inbound. Follow-up is where deals close. High ROI feature. |
| **Lead scoring/urgency assessment** | AI identifies which calls are most likely to convert and flags them as urgent | Medium | 1 | Helps owners prioritize callback. Adds value on top of lead capture. |
| **Predictable, transparent pricing** | Per-minute costs are variable/opaque for most competitors. Show clear math: X mins/mo = $Y | Medium | 1 | Retell AI's all-inclusive pricing ($0.14/min with Claude) is transparent vs. competitors' hidden overages. |
| **Sales playbook system** | Per-client sales scripts, objection handling, upsell triggers | High | 2 | When owner improves a script with good results, AI learns it. Compounds competitive advantage. |
| **Custom domain support** | Client's website on their own domain, not a subdomain | Medium | 2 | Branding matters. Phase 2 feature but worth mentioning. |
| **Outbound appointment reminders** | AI calls/texts customers to confirm appointments (reduces no-shows) | Medium | 2 | Revenue-protecting feature. Low dev cost, high ROI for clients. |
| **Conversation analytics** | Sentiment, emotion detection, objection triggers, best-performing responses | High | 2 | Competitive moat if you have this and competitors don't. Data-driven improvement. |
| **Integration with existing business tools** | Cal.com for booking, Stripe for payments, Slack for team notifications | Medium | 2 | Fewer context switches for the owner. Ecosystem play. |
| **Live call coaching** | Owner gets realtime transcript + suggested response while call is happening | High | 3 | Cutting-edge feature. Only feasible after product is stable and you have call data to analyze. |

**Differentiator Strategy for Phase 1:** Focus on SMS commands + real-time notifications (cheap wins with high perceived value). These are "secret sauce" that make it feel like a real employee.

**Differentiator Strategy for Phase 2:** Outbound calls + sales playbooks (high complexity, high ROI, hard to copy).

---

## Anti-Features

Features that are out of scope or explicitly NOT built. These are tempting to add but would slow down launch or go against the product strategy.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Client self-service dashboard (Phase 1)** | Adds auth complexity, slows down MVP. Owners just want to see their stuff; you can do that. | Phase 2. For now, only admin (you) logs in. Owner sees data via SMS. |
| **Multiple businesses per owner** | Complicates onboarding and auth. Small business owner usually owns 1-2 businesses max. | Single client per owner account. Phase 2: allow team accounts (multiple owners per business). |
| **Chat with AI customer support** | Your support should be human. AI support for small biz feels impersonal and bounces them through decision trees. | Human support via email/Slack. Phase 2: chatbot only for knowledge base questions, not support. |
| **Automatic knowledge base from web scraping** | Magic rarely works. Scraping is fragile and gives bad data to AI. | Simple import wizard. Owner pastes text or uploads file. You guide them through categories. |
| **Real-time live transcription during calls** | Retell AI doesn't support this; would need parallel service. Adds latency and cost. | Transcript after call ends (within 30 seconds). Good enough for owner to read while deciding to call back. |
| **SMS two-way chat threads** | Looks like a text conversation. Actually a notification + command system. Confusion. | Keep SMS as: AI sends news, owner sends commands. Simple. Linear. Not a chat app. |
| **Automatic call routing/IVR** | "Press 1 for sales, 2 for support" — this is what you're replacing. Defeats the purpose. | One AI agent per business. Always answers, always has full context. |
| **AI training/fine-tuning UI** | Tempting but dangerous. Owner clicks "train" and gets worse results. | Manual tuning via knowledge base + prompt improvements you push via updates. Keep owner's control to: knowledge base and personality config. |
| **Competitor analysis AI** | "AI knows your competitors and responds to them" — sounds cool, risky. Gets you sued or sounds defensive. | Optional knowledge base section on how to handle competitor objections. Owner writes the scripts. |
| **A/B testing AI scripts** | Useful but adds experimental complexity. Start with manual tuning. | Track which scripts work via call notes. Owner manually updates knowledge base. Iterate slowly. |
| **Video call support** | Scope creep. Small businesses don't need this. | Voice only, Phase 1. Video is Phase 3 if at all. |
| **Multilingual AI agents** | Nice-to-have but complicates initial setup. | Start with English. Phase 2: support Spanish, Vietnamese (depends on first client base). |
| **Unlimited concurrent calls** | Retell AI charges per concurrent call. Promise unlimited = you bankrupt. | Tier-based limits. Starter = 2 concurrent, Professional = 5, Enterprise = 10. Clear pricing. |
| **Free tier** | Retention is poor for "free" phone service. Tech-forward founders love free; small biz owners don't use it. | Start paid only. $299/mo minimum. Remove free tier friction — nobody uses it. |
| **Scheduling/appointment booking** | Tempting integrations (Cal.com, Calendly). But you're not a booking system. | Phase 2: optional Cal.com integration so AI can book directly. For now, owner handles callbacks. |
| **Handoff to human agent** | "Press 1 to talk to a human" defeats the product. | AI tries to solve everything. If AI can't handle it, owner gets notified with full context and calls back. |

**Anti-Feature Philosophy:** Every feature deferred is a day gained on launch. Defer ruthlessly. Compete on what you've built, not on what you *could* build.

---

## Feature Dependencies

Some features unlock or require others. Understanding these prevents building in wrong order.

```
FOUNDATION (must exist first):
  Inbound call answering
  ├─→ Call logging + transcription (can't have calls without storing them)
  ├─→ Business-specific knowledge (useless AI if it doesn't know the business)
  └─→ Caller info extraction (useless if you can't identify leads)

OWNER CONTROL (unlocked by foundation):
  Owner notifications (requires call data to send)
  ├─→ SMS command parsing (requires notification channel)
  └─→ Lead status tracking (owner commands change lead status)

VISIBILITY (unlocked by data):
  Dashboard (requires call + lead data to display)
  ├─→ Knowledge base editor (owner needs UI to add business info)
  ├─→ Lead scoring (requires call analysis)
  └─→ Analytics (requires aggregated call data)

ADVANCED (Phase 2, requires Phase 1 working):
  Outbound follow-up calls (requires accurate lead data + proven inbound flow)
  ├─→ Sales playbook system (requires outbound infrastructure)
  └─→ Conversation analytics (requires large call dataset to analyze)

FULL STACK (Phase 2, requires stable core):
  Client website (requires knowledge base stable + Supabase structure mature)
  ├─→ Website auto-updates (requires knowledge base editor working)
  └─→ Website booking integration (requires outbound follow-up or Cal.com integration)

SCALING (Phase 2+):
  Client self-service dashboard (requires multi-tenancy working + no critical bugs)
  Team/agency accounts (requires client dashboard working)
  Custom domains (requires website working + Vercel infrastructure stable)
```

**Build order implication:** Don't build the dashboard until calls are logging successfully. Don't build outbound until inbound is rock-solid.

---

## Feature Complexity Assessment

How hard each feature is to build, to unblock roadmap planning:

| Feature | Dev Hours | Risk | Notes |
|---------|-----------|------|-------|
| **Inbound call answering** | 20-30 | Medium | Retell AI handles heavy lifting. Main work: agent setup, webhook integration, debugging edge cases. |
| **Call logging + transcription** | 10-15 | Low | Straightforward database inserts. Retell provides transcript in webhook. |
| **Knowledge base system** | 15-20 | Low | CRUD interface + dynamic prompt building. UI is the work, not logic. |
| **Owner SMS notifications** | 10-15 | Low | Twilio integration straightforward. Parsing owner replies is ~5 hours. |
| **Lead capture + extraction** | 15-20 | Medium | Requires Claude API call to analyze transcript → extract structured data. Handle parsing errors. |
| **Dashboard (basic)** | 30-40 | Low | List pages, detail pages, search/filter. Standard CRUD UI. Biggest work is making it usable. |
| **Lead status tracking** | 5-10 | Low | Simple status enum update. Already in schema. |
| **AI personality configuration** | 10-15 | Low | Form inputs to agent config table. Pass to Retell when creating agent. |
| **After-hours handling** | 5-10 | Low | Business hours check + conditional voicemail message from Retell. |
| **Multi-tenancy** | 20-30 | High | Not per-feature; architectural. RLS policies, client_id everywhere, testing isolation. Do early or regret. |
| **Lead scoring** | 10-15 | Medium | Simple heuristic scoring (answered questions + service match) or call Claude to score. Tune after launch. |
| **Outbound follow-up calls** | 30-40 | High | Retell outbound API, scheduling logic, callback detection, follow-up script personalization. |
| **Sales playbook system** | 40-60 | High | Dynamic prompt injection per call. Objection detection. Script variation. Data-heavy. |
| **Website** | 25-35 | Medium | Next.js template, dynamic routing, Supabase pulling, SSR/ISR caching. Typical web app work. |
| **Conversation analytics** | 30-50 | High | Sentiment detection (use Retell's or Claude), emotion analysis, objection extraction, performance metrics. |
| **Custom domains** | 15-20 | Medium | Vercel API for domain mapping. Certificate management. Mostly infrastructure, not app code. |
| **Live call coaching** | 40-60 | High | Realtime transcript streaming, WebSocket connection to client's browser, suggested responses via Claude. Latency-sensitive. |

**MVP Feasibility:** All table stakes features can be built in 3 weeks (80-120 dev hours) with focused effort. Knowledge base editor is the most time-consuming user-facing feature.

---

## MVP Feature Set Recommendation

**What to ship for Interstate Tires launch:**

### Tier 1 (Required, no product without it)
1. Inbound call answering with Claude AI
2. Call logging + transcription
3. Caller information extraction → leads
4. Owner SMS notifications (real-time after call)
5. SMS command parsing (owner can text back)

### Tier 2 (Essential for product feel)
6. Knowledge base editor (owner must be able to update business info)
7. Dashboard home (overview: calls today, leads this week, recent call feed)
8. Call log view (search, filter, replay)
9. Lead list + detail (status tracking, history)
10. Basic AI personality config (greeting, voice, tone)

### Tier 3 (Polish, nice-to-have but valuable)
11. Lead scoring (urgency flag for owner)
12. After-hours voicemail
13. Daily summary SMS (evening report)
14. Simple analytics dashboard (calls/leads/duration metrics)
15. Client management (add/edit business info like hours, address)

### Defer to Phase 2
- Outbound follow-up calls
- Sales playbooks
- Website (included in initial package but built separately)
- Client self-service dashboard
- Advanced analytics (conversion funnels, heatmaps)
- Custom domains

**MVP Launch Success Criteria:**
- Interstate Tires calls the number and AI answers naturally
- Owner gets SMS within 10 seconds of call end
- Owner can text "call back" and see lead status update
- Dashboard shows all calls and leads with full context
- Owner can edit business info and AI reflects changes in next call

---

## Feature Launch Phases

### Phase 1: MVP (Ship 2026-Q1)

**Goal:** Prove the core loop works (call → notification → owner action → lead tracking)

**Features:**
- Inbound call answering
- Call logging + transcription
- Lead capture with automated extraction
- Owner SMS notifications + command parsing
- Basic dashboard (home, calls, leads, knowledge base, settings)
- Knowledge base editor
- After-hours handling
- Multi-tenancy (admin dashboard only)
- Lead scoring (simple)
- AI personality config (greeting, voice, tone)
- Daily summary emails

**Success Metrics:**
- Interstate Tires processes 50+ calls with <1% error rate
- Owner responds to 80%+ of SMS notifications
- Lead-to-booking conversion rate tracked
- No critical bugs for 2 weeks

### Phase 2: Advanced Features (2026-Q2)

**Goal:** Increase competitive moat and client revenue impact

**Features:**
- Outbound follow-up calls (auto-callback on missed leads)
- Sales playbooks (per-client scripts, objection handling)
- Client website with auto-updates
- Website booking integration (Cal.com)
- Conversation analytics (sentiment, objection detection, performance)
- Client self-service dashboard (client can log in and see their own data)
- Team/agency accounts (multiple owners, team inbox)
- SMS conversation threads (optional; more conversational)
- Custom domains for websites
- Advanced filters and saved views in dashboard

**Success Metrics:**
- 3-5 paying clients signed
- Outbound calls improve conversion by 20%+
- Website traffic to call conversion tracked
- Client dashboard adoption >60%

### Phase 3: Scaling & Integration (2026-Q3+)

**Goal:** Cross-platform AI employee (phone + OpenClaw + Tom)

**Features:**
- Tom/OpenClaw integration (unified dashboard)
- Cross-channel insights (social → calls → conversions)
- Live call coaching
- A/B testing framework for scripts and responses
- Multilingual agent support
- Video call support (optional)
- Advanced CRM integrations (HubSpot, Pipedrive)
- Agency portal for managing multiple clients
- White-label option

---

## Summary Table: Features by Category

| Category | Feature | Table Stakes? | Phase 1? | Complexity | Confidence |
|----------|---------|---------------|---------|------------|------------|
| **Call Handling** | Inbound answering | YES | YES | High | HIGH |
| | Call logging + transcription | YES | YES | High | HIGH |
| | After-hours handling | YES | YES | Low | HIGH |
| | Call quality/interruption handling | YES | Dependency | High | HIGH |
| **Lead Management** | Lead capture | YES | YES | Medium | HIGH |
| | Lead scoring | YES | YES | Medium | MEDIUM |
| | Lead status tracking | YES | YES | Low | HIGH |
| | Outbound follow-ups | NO | NO | High | MEDIUM |
| **Owner Control** | SMS notifications | YES | YES | Medium | HIGH |
| | SMS command parsing | YES | YES | Medium | HIGH |
| | Owner response context | YES | YES | Low | MEDIUM |
| **AI Configuration** | Personality/voice | YES | YES | Medium | HIGH |
| | Knowledge base editor | YES | YES | Medium | HIGH |
| | Sales playbooks | NO | NO | High | MEDIUM |
| **Visibility** | Dashboard (basic) | YES | YES | Medium | HIGH |
| | Dashboard (advanced analytics) | NO | NO | High | MEDIUM |
| | Website | YES | NO | Medium | HIGH |
| **Scaling** | Multi-tenancy | YES | YES | High | HIGH |
| | Client self-service | NO | NO | Medium | MEDIUM |
| | Custom domains | NO | NO | Medium | MEDIUM |
| | Team accounts | NO | NO | Medium | MEDIUM |

---

## Sources

**Primary:**
- `/Users/secretaria/ai-receptionist/CLAUDE.md` — Project instructions, MVP feature list, phase structure
- `/Users/secretaria/ai-receptionist/.planning/PROJECT.md` — Project context and requirements

**Secondary (Training Knowledge):**
- Retell AI documentation and product positioning (call quality, pricing, integrations)
- Competitive landscape: Parlance, Blab, Synthesia, Elevenlabs, Tavus, and other voice AI startups
- SaaS feature patterns for B2B small business tools
- Phase structure follows lean product development (MVP → validate → expand)

**Confidence Notes:**
- HIGH confidence on table stakes features: Directly from CLAUDE.md MVP feature list and project requirements
- MEDIUM confidence on differentiators and anti-features: Based on training knowledge of voice AI market, SaaS product strategy, and competitive positioning
- MEDIUM confidence on Phase 2+ complexity: Estimates based on typical SaaS development patterns; actual effort will vary with implementation choices

---

**Next Steps for Roadmap:**
- Use Phase 1 feature list to create detailed build tasks
- Create Figma wireframes for dashboard pages (Tier 2 features)
- Establish testing framework for call quality and notification reliability
- Research Retell AI API documentation for webhook event handling details
- Plan for Interstate Tires onboarding (knowledge base load strategy)
