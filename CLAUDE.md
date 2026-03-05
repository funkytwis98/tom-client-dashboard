# AI Phone Receptionist — Project Instructions

> **Project Type:** B2B SaaS — AI-powered phone receptionist for small businesses
> **First Client:** Interstate Tires (Chattanooga, TN)
> **Goal:** Ship MVP as fast as possible, then iterate

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Phase 1 — MVP (Ship This First)](#4-phase-1--mvp)
5. [Phase 2 — Advanced Features](#5-phase-2--advanced-features)
6. [Phase 3 — Tom Integration](#6-phase-3--tom-integration)
7. [Database Schema (Supabase)](#7-database-schema-supabase)
8. [Retell AI Integration](#8-retell-ai-integration)
9. [Owner Notification System](#9-owner-notification-system)
10. [Command Center Dashboard](#10-command-center-dashboard)
11. [Knowledge Base System](#11-knowledge-base-system)
12. [Authentication & Multi-Tenancy](#12-authentication--multi-tenancy)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Business Model & Pricing](#14-business-model--pricing)
15. [MVP Launch Checklist](#15-mvp-launch-checklist)

---

## 1. Product Overview

### What It Is

An AI phone receptionist service sold B2B to small businesses. Each client gets:

- A dedicated phone number answered by a custom AI agent
- An AI trained on their specific business (services, pricing, hours, FAQs, tone)
- Real-time text/call updates to the business owner
- A management dashboard

### How It Works (User Flow)

1. **Customer calls the business phone number** → Retell AI answers using the client's custom agent
2. **AI handles the call** → Answers questions, books appointments, qualifies leads, takes messages
3. **AI notifies the owner** → Texts the owner with lead details, missed call summaries, daily reports
4. **Owner can respond** → Text back commands like "call them back" or "offer 10% off"
5. **Data flows to dashboard** → All calls, leads, and metrics visible in the Command Center

### What Makes This Different

- Full-stack offering: phone agent + owner communication + dashboard — not just a phone answerer
- Sales-trained AI with business-specific knowledge, not generic IVR
- Owner stays in control via simple text commands
- Owner stays in the loop with real-time SMS updates (most competitors don't do this)

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Voice/Telephony | **Retell AI** | Inbound/outbound calls, SMS, voice agent |
| LLM | **Claude** (via Retell) | AI brain for conversations |
| Frontend | **Next.js 14+ (App Router)** | Command Center dashboard |
| Backend/DB | **Supabase** | Database, auth, real-time subscriptions, edge functions |
| Deployment | **Vercel** | Hosting for dashboard |
| Owner Notifications | **Twilio SMS** (or Retell native SMS) | Text updates to business owners |
| Scheduling | **Cal.com** (optional) | Appointment booking integration |
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

## 3. Project Structure

```
ai-receptionist/
├── apps/
│   ├── dashboard/              # Command Center (Next.js)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login/signup pages
│   │   │   ├── (dashboard)/    # Protected dashboard routes
│   │   │   │   ├── clients/    # Client management
│   │   │   │   ├── calls/      # Call logs & analytics
│   │   │   │   ├── leads/      # Lead management
│   │   │   │   ├── knowledge/  # Knowledge base editor
│   │   │   │   └── settings/   # Account settings
│   │   │   └── api/
│   │   │       ├── webhooks/
│   │   │       │   ├── retell/         # Retell call webhooks
│   │   │       │   └── sms-inbound/    # Owner SMS replies
│   │   │       ├── retell/             # Retell API proxy
│   │   │       ├── notifications/      # Owner notification triggers
│   │   │       └── cron/               # Daily summaries, follow-ups
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── supabase/       # Supabase client & helpers
│   │   │   ├── retell/         # Retell API client
│   │   │   ├── notifications/  # SMS/notification logic
│   │   │   └── knowledge/      # Knowledge base helpers
│   │   └── types/
│   │
├── packages/
│   └── shared/                 # Shared types, utils, constants
│
├── supabase/
│   ├── migrations/             # Database migrations
│   └── functions/              # Supabase Edge Functions
│       ├── retell-webhook/     # Process call events
│       ├── send-notification/  # Send owner SMS
│       └── daily-summary/      # Cron: daily report to owner
│
└── docs/
    └── instructions.md         # This file
```

**Note:** Currently running as a single Next.js app for the dashboard. Ship fast.

---

## 4. Phase 1 — MVP (Ship This First)

### MVP Features (Priority Order)

1. **Inbound call answering** — AI answers calls with client-specific knowledge
2. **Call logging** — Every call recorded, transcribed, and stored
3. **Owner text updates** — Real-time SMS to owner after each call
4. **Lead capture** — Extract caller info, intent, and urgency from calls
5. **Command Center dashboard** — View calls, leads, and manage knowledge base
6. **Knowledge base editor** — Add/edit business info the AI uses

### MVP Build Order

#### Step 1: Foundation (Day 1-2)
- [ ] Initialize Next.js project with App Router
- [ ] Set up Supabase project with initial schema (see Section 7)
- [ ] Set up Supabase auth (email/password for admin)
- [ ] Create basic dashboard layout with sidebar navigation
- [ ] Deploy to Vercel

#### Step 2: Retell AI Integration (Day 3-5)
- [ ] Create Retell AI account and get API keys
- [ ] Purchase a phone number through Retell
- [ ] Create first AI agent with Interstate Tires knowledge base
- [ ] Set up webhook endpoint (`/api/webhooks/retell`)
- [ ] Handle call events: `call_started`, `call_ended`, `call_analyzed`
- [ ] Store call data in Supabase (transcript, duration, caller info)
- [ ] Test inbound calls end-to-end

#### Step 3: Owner Notifications (Day 6-7)
- [ ] Set up Twilio account (or use Retell native SMS)
- [ ] Build notification service that texts owner after each call
- [ ] Format: "New call from [name/number]: [summary]. Lead score: [X/10]"
- [ ] Set up inbound SMS webhook for owner replies
- [ ] Parse basic owner commands ("call back", "not interested", etc.)

#### Step 4: Dashboard (Day 8-12)
- [ ] Call log page — list all calls with search/filter
- [ ] Call detail page — transcript, recording, caller info, lead score
- [ ] Leads page — extracted leads with status tracking
- [ ] Knowledge base editor — CRUD for business info
- [ ] Basic analytics — calls today, leads this week, avg call duration
- [ ] Client management — add/edit client businesses

#### Step 5: Testing with Interstate Tires (Day 13-20)
- [ ] Load Interstate Tires knowledge base (services, pricing, hours, common questions)
- [ ] Configure AI agent personality and tone
- [ ] Test 20+ real calls with various scenarios
- [ ] Tune prompts based on call quality
- [ ] Get feedback from Interstate Tires owner
- [ ] Fix issues and iterate

---

## 5. Phase 2 — Advanced Features

Build these AFTER MVP is stable and Interstate Tires is happy:

### Outbound Follow-Up Calls
- AI calls back leads who didn't book
- Configurable follow-up timing (e.g., 2 hours after missed call, next morning)
- Follow-up scripts per client
- "Review request" calls after completed services

### Sales Playbook System
- Per-client sales playbook the AI follows
- Objection handling scripts
- Upsell triggers (e.g., "oil change" → "we have a bundle deal with tire rotation")
- Urgency creation ("we only have 2 appointment slots left today")

### Client Self-Service Dashboard
- Client can log in and see their own calls/leads/analytics
- Edit their own knowledge base
- Manage their website content
- View billing and usage

### Advanced Analytics
- Call quality scoring
- Conversion rate tracking (call → booked appointment)
- Peak call time analysis
- Missed call patterns
- Revenue attribution

---

## 6. Phase 3 — Tom Integration

After the receptionist is proven and stable:

- Add phone receptionist as a module in the OpenClaw/Tom framework
- Unified dashboard: social media + phone + website all in one place
- Cross-channel insights (social engagement → phone calls → conversions)
- Single subscription for the full AI employee experience

---

## 7. Database Schema (Supabase)

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
  business_hours JSONB,                        -- { mon: { open: "8:00", close: "17:00" }, ... }
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

-- Website Content (dynamic content for client sites)
CREATE TABLE website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  section TEXT NOT NULL,                       -- "hero", "services", "about", "testimonials", "hours"
  content JSONB NOT NULL,                      -- Flexible content structure
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX idx_website_content_client_id ON website_content(client_id);
```

### Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;

-- Admin can see all their org's clients
CREATE POLICY "org_admin_clients" ON clients
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Cascade access through client_id for other tables
-- (Repeat pattern for each table)
CREATE POLICY "org_admin_calls" ON calls
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Public read for website content (no auth needed for client sites)
CREATE POLICY "public_website_content" ON website_content
  FOR SELECT USING (is_active = TRUE);

-- Public read for active knowledge base (needed for Retell webhook to build context)
CREATE POLICY "public_knowledge_base" ON knowledge_base
  FOR SELECT USING (is_active = TRUE);
```

---

## 8. Retell AI Integration

### Setup Steps

1. **Create account** at [retellai.com](https://retellai.com)
2. **Get API key** from dashboard
3. **Purchase phone number** (or bring your own via Twilio)
4. **Create an agent** with initial prompt and voice selection
5. **Set webhook URL** to your `/api/webhooks/retell` endpoint

### Agent Configuration

The Retell agent's system prompt should be dynamically built from the client's knowledge base. Here's the structure:

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
- Never make up information — only use what's in your knowledge base
- If caller asks for the owner, take a message and assure them someone will call back shortly

## Information to Capture on Every Call
- Caller's name
- Phone number (confirm the one they're calling from)
- What they need (service, question, complaint)
- When they'd like to come in (if applicable)
- How urgent it is
```

### Webhook Handler (`/api/webhooks/retell`)

```typescript
// Pseudocode — actual implementation will vary
export async function POST(req: Request) {
  const event = await req.json();

  switch (event.event) {
    case 'call_started':
      // Log call start in Supabase
      await supabase.from('calls').insert({
        client_id: getClientByPhone(event.to_number),
        retell_call_id: event.call_id,
        direction: event.direction,
        caller_number: event.from_number,
        status: 'in_progress'
      });
      break;

    case 'call_ended':
      // Update call with transcript, duration, recording
      await supabase.from('calls').update({
        status: 'completed',
        duration_seconds: event.duration,
        transcript: event.transcript,
        recording_url: event.recording_url
      }).eq('retell_call_id', event.call_id);

      // Analyze call with Claude to extract lead info
      const analysis = await analyzeCall(event.transcript);

      // Create lead if applicable
      if (analysis.is_lead) {
        await supabase.from('leads').insert({
          client_id: getClientByPhone(event.to_number),
          call_id: callRecord.id,
          name: analysis.caller_name,
          phone: event.from_number,
          service_interested: analysis.service,
          notes: analysis.notes,
          urgency: analysis.urgency,
          lead_score: analysis.lead_score
        });
      }

      // Send owner notification
      await notifyOwner(clientId, {
        type: 'new_call',
        summary: analysis.summary,
        caller: analysis.caller_name || event.from_number,
        lead_score: analysis.lead_score
      });
      break;

    case 'call_analyzed':
      // Retell's built-in analysis (sentiment, summary)
      await supabase.from('calls').update({
        summary: event.summary,
        sentiment: event.sentiment,
        call_metadata: event
      }).eq('retell_call_id', event.call_id);
      break;
  }

  return Response.json({ received: true });
}
```

### Dynamic Knowledge Base Loading

When Retell calls your webhook to get the agent prompt (or when you update the agent via API), build the prompt dynamically:

```typescript
async function buildAgentPrompt(clientId: string): Promise<string> {
  const { data: client } = await supabase
    .from('clients')
    .select('*, agent_config(*)')
    .eq('id', clientId)
    .single();

  const { data: knowledge } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  // Group knowledge by category
  const grouped = groupBy(knowledge, 'category');

  // Build the prompt string using the template above
  return buildPromptTemplate(client, client.agent_config, grouped);
}
```

---

## 9. Owner Notification System

### Notification Types

| Type | Trigger | Format |
|------|---------|--------|
| New Lead | After every call with lead score > 5 | "🔥 New lead! [Name] called about [service]. Score: [X/10]. [Summary]" |
| Missed Call | Call not answered or dropped | "📞 Missed call from [number] at [time]" |
| Daily Summary | Cron job at end of business day | "📊 Today: [X] calls, [Y] new leads, [Z] booked. Top lead: [Name]" |
| Urgent | Lead score 9-10 or explicit urgency | "🚨 URGENT: [Name] needs [service] ASAP. Call back: [number]" |
| Follow-Up Reminder | Lead not contacted after 24hrs | "⏰ Reminder: [Name] hasn't been contacted. Called about [service] yesterday." |

### Owner SMS Reply Parsing

When the owner texts back, parse their intent:

```
"call back" or "call them" → Mark lead as "contacted", trigger outbound call (Phase 2)
"not interested" or "pass" → Mark lead as "lost"
"booked" or "scheduled" → Mark lead as "booked"
"offer 10% off" → Note for next interaction with that lead
"stop" or "pause" → Pause notifications for this client
"resume" → Resume notifications
```

### Implementation

```typescript
// Inbound SMS webhook
export async function POST(req: Request) {
  const { From, Body } = await parseFormData(req); // Twilio format

  // Find which client this owner belongs to
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('owner_phone', From)
    .single();

  // Get the most recent lead/notification for context
  const { data: recentNotification } = await supabase
    .from('notifications')
    .select('*, leads(*)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Parse command and take action
  const command = parseOwnerCommand(Body);
  await executeCommand(command, client, recentNotification);

  // Log the response
  await supabase.from('notifications').update({
    owner_response: Body
  }).eq('id', recentNotification.id);
}
```

---

## 10. Command Center Dashboard

### Pages & Features

#### Dashboard Home (`/dashboard`)
- Total calls today/this week/this month
- New leads count
- Active clients overview
- Recent call feed (live updating via Supabase realtime)
- Quick stats: avg call duration, conversion rate, busiest hours

#### Clients (`/dashboard/clients`)
- List all client businesses
- Add new client wizard (name, phone, owner info, business details)
- Client detail view with all their data
- Status indicators (active, paused, setup needed)

#### Calls (`/dashboard/clients/[id]/calls`)
- Filterable call log (date range, direction, status, lead score)
- Call detail: full transcript, recording player, AI summary, sentiment
- Manual notes field for adding context

#### Leads (`/dashboard/clients/[id]/leads`)
- Kanban board or list view: New → Contacted → Booked → Completed / Lost
- Lead detail with call history
- Quick actions: mark as contacted, booked, lost
- Filter by urgency, date, service type

#### Knowledge Base (`/dashboard/clients/[id]/knowledge`)
- Category tabs: Services, Pricing, FAQ, Hours, Policies
- Rich text editor for each knowledge item
- Preview how the AI will use this info
- "Test a call" button to try the AI with current knowledge
- Import from existing website (URL scraper)

#### Agent Config (`/dashboard/clients/[id]/agent`)
- Agent name, voice selection, greeting
- Personality and sales style editors
- Escalation rules
- Test call interface (call yourself to test)
- Call flow visualization (Phase 2)

#### Analytics (`/dashboard/clients/[id]/analytics`)
- Call volume over time
- Lead conversion funnel
- Peak hours heatmap
- Average call duration trends
- Top reasons people call
- Owner response time to leads

#### Settings (`/dashboard/settings`)
- Your account settings
- Notification preferences
- Billing management (Stripe)
- API keys
- Team members (Phase 2)

---

## 11. Knowledge Base System

### How It Works

The knowledge base is the AI's brain for each client. It's a collection of text entries organized by category that get injected into the AI agent's system prompt.

### Categories

- **Services** — What the business offers, detailed descriptions
- **Pricing** — Price lists, packages, deals, payment methods
- **FAQ** — Common questions and their answers
- **Hours** — Business hours, holiday schedules, after-hours policy
- **Policies** — Cancellation, warranty, returns, etc.
- **Location** — Address, directions, parking, landmarks
- **Team** — Key staff names and roles (so AI can say "I'll have Mike call you back")
- **Promotions** — Current deals, seasonal offers
- **Competitors** — How to position against competitors (tactful responses)

### Knowledge Base Editor Features

- Markdown or rich text editor per entry
- Character count with "AI context budget" indicator
- Drag-and-drop priority ordering
- Toggle entries active/inactive without deleting
- Import tool: paste a URL and auto-extract business info
- "Generate from description" — AI writes knowledge base entries from a plain text business description

### Context Window Management

Retell + Claude has a context limit. The knowledge base needs to fit within this. Strategy:

1. Always include: greeting, personality, business hours, top services
2. Prioritize by `priority` field
3. For large knowledge bases, use RAG: embed entries and retrieve only relevant ones based on the caller's question
4. Start simple (stuff everything in prompt), optimize later with RAG if needed

---

## 12. Authentication & Multi-Tenancy

### Auth Flow

- **Admin (you)** — Supabase auth, full access to all clients
- **Client owners (Phase 2)** — Supabase auth, scoped to their own data
- **Public (websites)** — No auth, read-only access to website content
- **Webhooks (Retell, Twilio)** — API key or webhook secret validation

### Multi-Tenancy Model

Everything is scoped by `client_id`. The `clients` table is the central reference point:

```
organizations → clients → [calls, leads, knowledge_base, agent_config, notifications]
```

RLS policies enforce that users can only see data for clients in their organization.

---

## 13. Deployment & Infrastructure

### Vercel Setup

- **Dashboard app** — Deployed as main project (`dashboard.yourplatform.com`)
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

### Supabase Setup

- Enable Realtime on `calls` and `leads` tables
- Set up Edge Functions for background processing
- Configure cron jobs for daily summaries
- Enable pgvector extension if implementing RAG for knowledge base (Phase 2)

### Domain Strategy

- `yourplatform.com` — Marketing site
- `app.yourplatform.com` — Command Center dashboard

---

## 14. Business Model & Pricing

### Your Costs Per Client (Estimated)

| Cost Item | Monthly Estimate |
|-----------|-----------------|
| Retell AI (~500 mins @ $0.14/min) | ~$70 |
| Twilio SMS (~200 messages) | ~$15 |
| Supabase (shared) | ~$5 |
| Vercel (shared) | ~$5 |
| Phone number | ~$2 |
| **Total per client** | **~$97** |

### Pricing Tiers

| Tier | Price/mo | Includes |
|------|---------|----------|
| **Starter** | $299/mo | Inbound answering, 500 mins, owner texts |
| **Professional** | $499/mo | + Outbound follow-ups, 1000 mins, sales playbook, advanced analytics |
| **Enterprise** | $799/mo | + Custom integrations, unlimited mins, priority support, custom domain |

**Margins:** At $299/mo with ~$97 cost, that's ~$200 profit per client. 10 clients = $2,000/mo profit. Scale from there.

### Onboarding Fee

Consider a one-time $500 setup fee to cover:
- Knowledge base creation
- Agent personality tuning
- Initial testing and optimization

---

## 15. MVP Launch Checklist

### Before First Real Call

- [ ] Retell AI account created and funded
- [ ] Phone number purchased and assigned to agent
- [ ] Interstate Tires knowledge base loaded (minimum 20 entries)
- [ ] Agent greeting and personality configured
- [ ] Webhook endpoint live and receiving events
- [ ] Call logging working in Supabase
- [ ] Owner SMS notifications working
- [ ] Dashboard showing call data
- [ ] 10+ test calls completed successfully
- [ ] After-hours handling configured (voicemail message)
- [ ] Escalation rules defined (when to say "let me have the owner call you")

### Before Selling to Second Client

- [ ] Interstate Tires running smoothly for 2+ weeks
- [ ] Multi-tenant architecture working (new client doesn't affect existing)
- [ ] Client onboarding workflow documented
- [ ] Knowledge base template/wizard for fast setup
- [ ] Billing integration (Stripe) working
- [ ] Daily summary notifications tested
- [ ] Owner reply parsing working reliably
- [ ] Performance monitoring in place
- [ ] Basic error handling and fallbacks tested

---

## Quick Reference: Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/webhooks/retell` | Receives Retell call events |
| `POST /api/webhooks/sms-inbound` | Receives owner SMS replies |
| `POST /api/retell/update-agent` | Updates Retell agent with new knowledge base |
| `POST /api/notifications/send` | Triggers owner notification |
| `GET /api/cron/daily-summary` | Generates and sends daily summary (cron) |
| `GET /api/clients/[id]/knowledge` | Fetches knowledge base for agent prompt |

---

## Notes

- **Keep it separate from Tom for now.** Get this working standalone first. Integration into the OpenClaw framework comes in Phase 3 after the product is proven.
- **Ship fast, iterate based on real calls.** The knowledge base and prompts will need constant tuning based on actual call data. Don't try to perfect it before launch.
- **Retell AI has a Discord community** — use it for troubleshooting. They're responsive.
- **Record everything.** Every call transcript is training data for making the AI better.
- **The owner notification layer is the secret weapon.** Small business owners want to feel in control. The text updates make this feel like a real employee reporting to them, not a black box.
