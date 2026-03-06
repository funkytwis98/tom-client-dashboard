# T.O.M. Agency — AI Receptionist

> **Agency:** T.O.M. Agency (Technology Optimization & Management)
> **Product:** AI Phone Receptionist (Product #2 of 3)
> **First Client:** Interstate Tires (Chattanooga, TN)
> **Repo:** ai-receptionist

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [Product Architecture](#2-product-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Phase 1 — Finish MVP](#5-phase-1--finish-mvp)
6. [Phase 2 — Sellable Product](#6-phase-2--sellable-product)
7. [Phase 3 — Website Product](#7-phase-3--website-product)
8. [Phase 4 — Tom's Brain Migration](#8-phase-4--toms-brain-migration)
9. [Database Schema (Supabase)](#9-database-schema-supabase)
10. [Retell AI Integration](#10-retell-ai-integration)
11. [Owner Notification System](#11-owner-notification-system)
12. [Dashboard Pages](#12-dashboard-pages)
13. [Knowledge Base System](#13-knowledge-base-system)
14. [Authentication & Multi-Tenancy](#14-authentication--multi-tenancy)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Business Model & Pricing](#16-business-model--pricing)

---

## 1. Business Overview

### T.O.M. Agency — The Big Picture

T.O.M. Agency sells three products to local businesses as a progressive upsell chain:

| # | Product | Role | Status |
|---|---------|------|--------|
| 1 | **Custom Websites** | Entry point — gets the client in the door | Phase 3 — custom-built via Claude Code, deployed to Cloudflare |
| 2 | **AI Receptionist** | First upsell — answers their phone 24/7 | **This repo** — MVP nearly done |
| 3 | **AI Social Media Manager** | Second upsell — manages their social presence | Separate app (Command Center) — already built |

### Two Dashboards

| Dashboard | Who uses it | Purpose |
|-----------|------------|---------|
| **AI Receptionist Dashboard** | Business owners / front desk staff | Manage calls, leads, customers (CRM), knowledge base, billing |
| **Tom's Brain Command Center** | You (the agency) | Master dashboard to manage all clients across all three products |

### Sales Flow

1. Sell a **custom website** to a local business (entry point, low friction)
2. Upsell the **AI Receptionist** — "Your new website will drive more calls, let AI handle them"
3. Upsell the **AI Social Media Manager** — "Now let's drive even more traffic to your site and phone"
4. All three services managed from **Tom's Brain** as the agency master dashboard

### T.O.M. Agency Marketing Website (External)

- **URL:** https://yourbrand-site-dun.vercel.app
- **Status:** In progress, built by brother (separate repo, we don't manage it)
- **Pages:** AI Receptionist, AI Social Manager, combined bundle, pricing, case studies (Interstate Tires), book-a-demo
- **Purpose:** Public-facing site that drives leads into the agency

---

## 2. Product Architecture

### AI Receptionist (This Repo)

An AI phone receptionist service for local businesses. Each client gets:

- A dedicated phone number answered by a custom AI agent
- An AI trained on their specific business (services, pricing, hours, FAQs, tone)
- Real-time text/call updates to the business owner
- A dashboard where they manage calls, leads, customers, and knowledge base

### How It Works (User Flow)

1. **Customer calls the business phone number** — Retell AI answers using the client's custom agent
2. **AI handles the call** — Answers questions, books appointments, qualifies leads, takes messages
3. **AI notifies the owner** — Texts the owner with lead details, missed call summaries, daily reports
4. **Owner can respond** — Text back commands like "call them back" or "offer 10% off"
5. **Data flows to dashboard** — All calls, leads, and metrics visible in the AI Receptionist dashboard

### What Makes This Different

- Full-stack offering: phone agent + owner communication + CRM + dashboard
- Sales-trained AI with business-specific knowledge, not generic IVR
- Owner stays in control via simple text commands
- Owner stays in the loop with real-time SMS updates (most competitors don't do this)
- Part of a three-product ecosystem (website + phone + social media)

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Voice/Telephony | **Retell AI** | Inbound/outbound calls, SMS, voice agent |
| LLM | **Claude** (via Retell) | AI brain for conversations |
| Frontend | **Next.js 15 (App Router)** | AI Receptionist dashboard |
| Backend/DB | **Supabase** | Database, auth, real-time subscriptions, edge functions |
| Deployment | **Vercel** | Hosting for dashboard |
| Owner Notifications | **Twilio SMS** | Text updates to business owners |
| Payments | **Stripe** | Subscription billing for clients |

### Why Retell AI

- $0.07+/min all-inclusive base (real cost ~$0.14/min with Claude LLM)
- Both inbound AND outbound calling natively
- Native SMS support
- Drag-and-drop flow builder + full API access
- Sub-800ms latency with interruption handling
- Integrates with Twilio, n8n, Cal.com, custom webhooks
- SOC 2, HIPAA, GDPR compliant
- 60 free minutes + 20 concurrent calls to start

---

## 4. Project Structure

Currently running as a single Next.js 15 app (not monorepo).

```
ai-receptionist/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login/signup pages
│   │   ├── (dashboard)/         # Protected dashboard routes
│   │   │   ├── clients/         # Client management (agency view)
│   │   │   ├── calls/           # Call logs & analytics
│   │   │   ├── leads/           # Lead management
│   │   │   ├── knowledge/       # Knowledge base editor
│   │   │   └── settings/        # Account settings
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   ├── retell/      # Retell call webhooks
│   │   │   │   └── twilio/      # Owner SMS replies
│   │   │   ├── admin/           # Admin endpoints (backfill, sync)
│   │   │   └── cron/            # Daily summaries, follow-ups
│   │   └── actions/             # Server actions
│   ├── components/
│   ├── lib/
│   │   ├── supabase/            # Supabase client & helpers
│   │   ├── retell/              # Retell API client & agent builder
│   │   ├── notifications/       # SMS/notification logic
│   │   ├── monitoring/          # Error reporting & alerts
│   │   └── middleware/          # Rate limiting
│   └── types/
├── supabase/
│   └── migrations/              # Database migrations
└── CLAUDE.md                    # This file
```

---

## 5. Phase 1 — Finish MVP

**Goal:** Get Interstate Tires live and the AI Receptionist working end-to-end.

### Already Done
- [x] Inbound call answering via Retell AI
- [x] Call logging (transcripts, recordings, summaries)
- [x] Owner SMS notifications (real-time texts after each call)
- [x] Lead capture & extraction (Claude Haiku analyzes transcripts)
- [x] Dashboard with analytics, charts, hot leads
- [x] Knowledge base editor (CRUD per client, categories)
- [x] Client onboarding wizard (4-step, auto-provisions Retell agent + phone number)
- [x] Error monitoring & admin SMS alerts (system_errors table)
- [x] Rate limiting on all webhook/API endpoints
- [x] Auth & multi-tenancy (Supabase auth, RLS, org-scoped)
- [x] Deployed on Vercel + Supabase

### Remaining
1. **Stripe billing** — subscription plans, checkout, usage tracking
2. **After-hours handling** — wire up voicemail config to Retell agent
3. **Daily summary cron** — real-world testing of existing endpoint
4. **Live testing with Interstate Tires** — 10+ test calls, prompt tuning, owner feedback

---

## 6. Phase 2 — Sellable Product

**Goal:** Make the AI Receptionist a product any local business can buy, with self-service features.

### CRM Tab for Business Owners
- The "Clients" tab in the dashboard becomes a CRM for the business owner's customers
- Customer profiles with full call history, lead status, follow-up tracking
- Contact management (name, phone, email, notes, tags)
- Follow-up reminders and status pipeline (New → Contacted → Booked → Completed → Lost)

### Client Self-Service Dashboard
- Business owners log in scoped to their own data
- Edit their own knowledge base (services, pricing, FAQs)
- View their own calls, leads, analytics, and CRM
- Manage billing and usage (Stripe customer portal)

### Sales Playbook System
- Per-client sales playbook the AI follows during calls
- Objection handling scripts
- Upsell triggers (e.g., "oil change" → "we have a bundle deal with tire rotation")
- Urgency creation ("we only have 2 appointment slots left today")

---

## 7. Phase 3 — Website Product

**Goal:** Deliver custom websites for local businesses as the entry point to the T.O.M. Agency sales funnel.

### Approach

Each client website is **custom-built using Claude Code** — not a template system. Sites are individually crafted, deployed to **Cloudflare Pages**, and connected to the AI Receptionist via the existing **public API** (`GET /api/public/client/[slug]`).

### How It Works

1. **Build:** Use Claude Code to create a custom static site per client (HTML/CSS/JS or lightweight framework)
2. **Deploy:** Push to Cloudflare Pages with a custom domain per client
3. **Connect:** Site fetches business data (hours, services, phone) from the AI Receptionist public API
4. **Integrate:** Click-to-call buttons link to the client's Retell phone number

### Why This Approach

- Each site is unique — not cookie-cutter templates that look like every other local business
- Cloudflare Pages = free hosting, global CDN, custom domains, zero ongoing cost
- Public API already exists — sites pull live business data without duplication
- No template system to maintain in this repo — websites are separate repos/projects
- Claude Code can build a custom site in minutes, not hours

### What Lives in This Repo

- `GET /api/public/client/[slug]` — public endpoint that serves business data to client websites
- Knowledge base data that websites can pull from (services, hours, address, etc.)
- Nothing else — client websites are separate projects deployed to Cloudflare

---

## 8. Phase 4 — Tom's Brain Migration

**Goal:** Unify all three products under one master agency dashboard.

- Disconnect Tom's Brain Command Center from OpenClaw
- Rewire to Claude Code as the AI backbone
- Merge Command Center as the master agency dashboard (manage all clients, all products)
- Single subscription tiers that bundle website + receptionist + social media
- Cross-channel insights (social engagement → phone calls → website conversions)

*Detailed spec TBD when Phase 3 is complete.*

---

## 9. Database Schema (Supabase)

### Core Tables

```sql
-- Organizations (your admin accounts)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (businesses you serve)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- "Interstate Tires"
  slug TEXT UNIQUE NOT NULL,                   -- "interstate-tires"
  phone_number TEXT,                           -- Retell AI phone number
  retell_agent_id TEXT,                        -- Retell agent ID
  owner_name TEXT,                             -- Business owner name
  owner_phone TEXT,                            -- Owner's personal phone for notifications
  owner_email TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  business_hours JSONB,                        -- { monday: { open: "8:00", close: "17:00" }, ... }
  address JSONB,                               -- { street, city, state, zip }
  website_domain TEXT,                         -- Custom domain if any
  settings JSONB DEFAULT '{}',                 -- Notification preferences, AI personality, etc.
  subscription_tier TEXT DEFAULT 'standard',   -- standard, premium, enterprise
  subscription_status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base (per-client AI brain)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                      -- "services", "pricing", "faq", "hours", "policies"
  title TEXT NOT NULL,                         -- "Tire Installation"
  content TEXT NOT NULL,                       -- Detailed info the AI uses
  priority INTEGER DEFAULT 0,                  -- Higher = more important for AI context
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls (every call logged)
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  retell_call_id TEXT UNIQUE,                  -- Retell's call ID
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  caller_number TEXT,
  caller_name TEXT,                            -- If identified
  status TEXT DEFAULT 'completed',             -- completed, missed, voicemail, transferred
  duration_seconds INTEGER,
  transcript TEXT,                             -- Full call transcript
  summary TEXT,                                -- AI-generated summary
  recording_url TEXT,
  sentiment TEXT,                              -- positive, neutral, negative
  lead_score INTEGER CHECK (lead_score BETWEEN 1 AND 10),
  call_metadata JSONB DEFAULT '{}',            -- Extra data from Retell
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (extracted from calls)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id),
  name TEXT,
  phone TEXT,
  email TEXT,
  service_interested TEXT,                     -- What they called about
  notes TEXT,                                  -- AI-extracted notes
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'booked', 'completed', 'lost')),
  follow_up_at TIMESTAMPTZ,                   -- When to follow up
  owner_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (log of all owner notifications)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id),
  lead_id UUID REFERENCES leads(id),
  type TEXT NOT NULL,                          -- "new_lead", "missed_call", "daily_summary", "follow_up"
  channel TEXT DEFAULT 'sms',                  -- "sms", "email", "push"
  recipient_phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent',                  -- sent, delivered, failed
  owner_response TEXT,                         -- What the owner texted back
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Agent Personality (per-client voice/tone config)
CREATE TABLE agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  agent_name TEXT DEFAULT 'receptionist',      -- What the AI calls itself
  greeting TEXT,                               -- "Thanks for calling Interstate Tires, this is Sarah, how can I help?"
  personality TEXT,                            -- "friendly, professional, knowledgeable about tires"
  sales_style TEXT,                            -- "consultative, not pushy, asks good questions"
  escalation_rules TEXT,                       -- When to transfer to owner
  voicemail_message TEXT,                      -- After-hours message
  voice_id TEXT,                               -- Retell voice selection
  language TEXT DEFAULT 'en-US',
  custom_instructions TEXT,                    -- Additional prompt instructions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Errors (error monitoring)
CREATE TABLE system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_calls_client_id ON calls(client_id);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_knowledge_base_client_id ON knowledge_base(client_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_notifications_client_id ON notifications(client_id);
```

### Row Level Security

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;

-- Admin can see all their org's clients
CREATE POLICY "org_admin_clients" ON clients
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Cascade access through client_id for other tables
CREATE POLICY "org_admin_calls" ON calls
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Public read for active knowledge base (needed for Retell webhook to build context)
CREATE POLICY "public_knowledge_base" ON knowledge_base
  FOR SELECT USING (is_active = TRUE);
```

---

## 10. Retell AI Integration

### Agent Configuration

The Retell agent's system prompt is dynamically built from the client's knowledge base:

```
You are {agent_name}, the AI receptionist for {client_name}.

## Your Personality
{personality}

## Greeting
Always answer with: "{greeting}"

## Business Information
{dynamically loaded from knowledge_base table}

## Services & Pricing
{dynamically loaded from knowledge_base where category = 'services'}
{dynamically loaded from knowledge_base where category = 'pricing'}

## Hours of Operation
{business_hours formatted}

## Sales Approach
{sales_style}

## Rules
- Always be helpful, warm, and professional
- If you don't know something, say "Let me have {owner_name} get back to you on that"
- For emergencies or complex issues: {escalation_rules}
- Always try to book an appointment or capture contact info
- Never make up information -- only use what's in your knowledge base
- If caller asks for the owner, take a message and assure them someone will call back shortly

## Information to Capture on Every Call
- Caller's name
- Phone number (confirm the one they're calling from)
- What they need (service, question, complaint)
- When they'd like to come in (if applicable)
- How urgent it is
```

### Webhook Handler

`POST /api/webhooks/retell` handles: `call_started`, `call_ended`, `call_analyzed`

On `call_ended`: stores transcript/recording, runs lead extraction via Claude Haiku, creates lead record, sends owner SMS notification.

---

## 11. Owner Notification System

### Notification Types

| Type | Trigger | Format |
|------|---------|--------|
| New Lead | After every call with lead score > 5 | "New lead! [Name] called about [service]. Score: [X/10]. [Summary]" |
| Missed Call | Call not answered or dropped | "Missed call from [number] at [time]" |
| Daily Summary | Cron job at end of business day | "Today: [X] calls, [Y] new leads, [Z] booked. Top lead: [Name]" |
| Urgent | Lead score 9-10 or explicit urgency | "URGENT: [Name] needs [service] ASAP. Call back: [number]" |

### Owner SMS Reply Parsing

```
"call back" or "call them" -> Mark lead as "contacted"
"not interested" or "pass" -> Mark lead as "lost"
"booked" or "scheduled"   -> Mark lead as "booked"
"stop" or "pause"          -> Pause notifications
"resume"                   -> Resume notifications
```

---

## 12. Dashboard Pages

### Current (Agency Admin View)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard Home | `/` | Stats, charts, hot leads, system health, recent calls |
| Clients | `/clients` | List all client businesses, onboarding wizard |
| Client Detail | `/clients/[id]` | Per-client analytics, calls, leads, KB, agent config |
| Calls | `/clients/[id]/calls` | Filterable call log, transcript, recording, sentiment |
| Leads | `/clients/[id]/leads` | Lead pipeline (New -> Contacted -> Booked -> Completed/Lost) |
| Knowledge Base | `/clients/[id]/knowledge` | CRUD for business info the AI uses |
| Settings | `/settings` | Account settings, notification preferences |

### Phase 2 Additions

| Page | Route | Purpose |
|------|-------|---------|
| CRM (Customers) | `/customers` | Business owner's customer list with call history & follow-ups |
| Self-Service KB | `/knowledge` | Client edits their own knowledge base |
| Billing | `/billing` | Client views usage and manages Stripe subscription |
| Sales Playbook | `/clients/[id]/playbook` | Agency configures per-client upsell/objection scripts |

---

## 13. Knowledge Base System

### Categories

- **Services** -- What the business offers, detailed descriptions
- **Pricing** -- Price lists, packages, deals, payment methods
- **FAQ** -- Common questions and their answers
- **Hours** -- Business hours, holiday schedules, after-hours policy
- **Policies** -- Cancellation, warranty, returns, etc.
- **Location** -- Address, directions, parking, landmarks
- **Team** -- Key staff names and roles
- **Promotions** -- Current deals, seasonal offers
- **Competitors** -- How to position against competitors (tactful responses)

### Context Window Management

1. Always include: greeting, personality, business hours, top services
2. Prioritize by `priority` field
3. Start simple (stuff everything in prompt), optimize later with RAG if needed

---

## 14. Authentication & Multi-Tenancy

### Auth Flow

- **Agency admin (you)** -- Supabase auth, full access to all clients
- **Client owners (Phase 2)** -- Supabase auth, scoped to their own data
- **Webhooks (Retell, Twilio)** -- API key / webhook secret validation

### Multi-Tenancy Model

Everything is scoped by `client_id`:

```
organizations -> clients -> [calls, leads, knowledge_base, agent_config, notifications]
```

RLS policies enforce that users can only see data for clients in their organization.

---

## 15. Deployment & Infrastructure

### Vercel Setup

- **Dashboard app** deployed on Vercel
- **Environment variables:**
  - `RETELL_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
  - `STRIPE_SECRET_KEY`
  - `REVALIDATE_SECRET`
  - `ADMIN_ALERT_PHONE`
  - `ANTHROPIC_API_KEY`

---

## 16. Business Model & Pricing

### T.O.M. Agency Product Pricing

| Product | Price/mo | Role in funnel |
|---------|---------|----------------|
| **Custom Website** | One-time + hosting | Entry point |
| **AI Receptionist** | $299-799/mo | First upsell |
| **AI Social Media** | TBD | Second upsell |
| **Full Bundle** | TBD (Phase 4) | All three services |

### AI Receptionist Tiers

| Tier | Price/mo | Includes |
|------|---------|----------|
| **Starter** | $299/mo | Inbound answering, 500 mins, owner texts, dashboard |
| **Professional** | $499/mo | + Outbound follow-ups, 1000 mins, sales playbook, CRM |
| **Enterprise** | $799/mo | + Custom integrations, unlimited mins, priority support |

### Costs Per Client (Estimated)

| Cost Item | Monthly Estimate |
|-----------|-----------------|
| Retell AI (~500 mins @ $0.14/min) | ~$70 |
| Twilio SMS (~200 messages) | ~$15 |
| Supabase (shared) | ~$5 |
| Vercel (shared) | ~$5 |
| Phone number | ~$2 |
| **Total per client** | **~$97** |

**Margins:** At $299/mo with ~$97 cost = ~$200 profit per client.

---

## Quick Reference

### Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/webhooks/retell` | Receives Retell call events |
| `POST /api/webhooks/twilio` | Receives owner SMS replies |
| `POST /api/retell/sync` | Syncs Retell agent with current knowledge base |
| `GET /api/cron/daily-summary` | Generates and sends daily summary |
| `POST /api/admin/backfill-leads` | Backfill lead extraction for existing calls |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/retell/agent-builder.ts` | Creates Retell LLM + agent + phone number |
| `src/lib/notifications/sms.ts` | Twilio SMS sending |
| `src/lib/lead-extraction.ts` | Claude Haiku lead analysis |
| `src/lib/monitoring/report-error.ts` | Central error reporting |
| `src/lib/middleware/rate-limit.ts` | Rate limiting |
| `src/app/actions/clients.ts` | Client onboarding server action |
| `src/app/actions/monitoring.ts` | Error resolution actions |

---

## Notes

- **Ship fast, iterate based on real calls.** The knowledge base and prompts will need constant tuning based on actual call data.
- **Retell AI has a Discord community** -- use it for troubleshooting. They're responsive.
- **Record everything.** Every call transcript is training data for making the AI better.
- **The owner notification layer is the secret weapon.** Small business owners want to feel in control. The text updates make this feel like a real employee reporting to them, not a black box.
- **DB uses FULL day names** ("monday" not "mon") for business_hours -- this is handled in `src/lib/time.ts`.
- **No .env.local on this machine** -- all secrets are on Vercel only.
