# Architecture Patterns

**Project:** AI Phone Receptionist SaaS
**Researched:** 2026-03-01
**Confidence:** HIGH (based on project instructions and standard patterns for voice APIs)

## Recommended Architecture

The system is fundamentally an **event-driven multi-tenant pipeline** where calls flow through voice processing, lead extraction, notification dispatch, and persistence. All data is scoped by `client_id` for multi-tenancy.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CALL INBOUND FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Caller → Retell AI Agent → Claude LLM → Call Handling
           ↓
      [call_started webhook]
           ↓
    Next.js /api/webhooks/retell
           ↓
      Supabase (calls table)
           ↓
      [call_ended webhook]
           ↓
    Call Analysis (Claude) → Lead Extraction → Lead Creation
           ↓
    Owner Notification (Twilio SMS)
           ↓
    Dashboard Real-time Update (Supabase Realtime)

┌─────────────────────────────────────────────────────────────────┐
│                     OWNER REPLY FLOW                            │
└─────────────────────────────────────────────────────────────────┘

Owner SMS → Twilio Webhook → Next.js /api/webhooks/sms-inbound
                ↓
            Command Parse
                ↓
        Lead Status Update (Supabase)
                ↓
        Dashboard Reflects Change (Realtime)
```

## Component Boundaries

### Core Components

| Component | Responsibility | Communicates With | Data Flow |
|-----------|---------------|-------------------|-----------|
| **Retell AI Agent** | Answers inbound calls, runs conversational flow, captures caller info | Claude LLM (via Retell), Next.js webhooks | Outbound: call events via webhooks. Inbound: agent configuration from knowledge base |
| **Claude LLM** | Powers the AI conversation logic, analyzes calls for leads/sentiment/urgency | Retell AI (prompt injection), Call Analysis service | Inbound: call transcript. Outbound: analysis results |
| **Call Handler Webhook** (`/api/webhooks/retell`) | Processes Retell events (call_started, call_ended, call_analyzed) | Supabase calls table, Lead Extraction, Notification Service | Receives webhook events from Retell, writes to Supabase, triggers downstream services |
| **Lead Extraction Service** | Analyzes call transcripts to extract caller name, intent, urgency, lead score | Claude LLM, Supabase leads table | Inbound: transcript. Outbound: structured lead data |
| **Notification Service** | Formats and sends SMS to owner with call summaries | Twilio API, Supabase notifications table | Inbound: call summary + metadata. Outbound: SMS to owner phone |
| **Owner Reply Handler** (`/api/webhooks/sms-inbound`) | Parses owner text commands and updates lead status | Supabase leads table, Command Parser | Receives SMS from Twilio, parses intent, updates database |
| **Command Center Dashboard** (`/dashboard/*`) | Displays calls, leads, knowledge base, agent config, analytics | Supabase (via client-side), Retell API for config updates | Real-time subscriptions to calls/leads tables, HTTP requests to update knowledge base |
| **Knowledge Base Manager** | CRUD for per-client business information | Supabase knowledge_base table | Reads for agent prompt building, writes from dashboard editor |
| **Agent Config Service** | Builds and updates Retell AI agent system prompt dynamically | Supabase agent_config table, knowledge_base table, Retell API | Reads config + knowledge base, builds prompt string, pushes to Retell |
| **Supabase Backend** | Database, authentication, RLS, realtime subscriptions | All components | Central source of truth for all persistent data |

### External Integrations

| Service | Purpose | Integration Type | Data Boundary |
|---------|---------|------------------|---------------|
| **Retell AI** | Voice answering, call handling, agent management | REST API + Webhooks | Inbound: phone calls. Outbound: webhooks for call events. Bidirectional: agent config updates |
| **Twilio** | SMS delivery and inbound SMS reception | REST API + Webhooks | Outbound: SMS to owner. Inbound: owner replies via webhook |
| **Claude LLM** | Conversation intelligence and call analysis | Via Retell AI's integration | Runs inside Retell agent; separate calls for post-call analysis |
| **Vercel** | Hosting and deployment | Git-based deployment | Hosts Next.js app, runs API routes and edge functions |

## Data Flow

### End-to-End Call Flow

```
1. INBOUND CALL ARRIVES
   Caller dials client's Retell phone number
   ↓

2. RETELL RECEIVES & ROUTES
   Retell identifies client from phone number
   Loads agent configuration + knowledge base
   Connects to Claude LLM
   ↓

3. CALL HANDLING (in Retell + Claude)
   Agent answers with greeting
   Claude understands context from knowledge base
   Conversation happens with interruption handling
   Agent extracts caller info (name, intent, contact)
   ↓

4. CALL ENDS
   Retell sends call_ended webhook to Next.js
   ↓

5. WEBHOOK PROCESSING (/api/webhooks/retell)
   Request arrives with: call_id, transcript, duration, recording_url, caller_number
   ↓

6. DATABASE WRITE
   Create call record in Supabase calls table
   Status: "completed", transcript stored, recording_url linked
   ↓

7. LEAD EXTRACTION (Async Job)
   Call transcript sent to Claude via separate API call
   Prompt: "Extract: caller name, service interested, urgency (1-10), lead score (1-10), summary"
   Claude returns structured JSON
   ↓

8. LEAD CREATION
   If lead_score >= 5, create leads table entry with extracted data
   Mark notification_required: true
   ↓

9. OWNER NOTIFICATION
   Build SMS message: "New lead from [name] about [service]. Score: [X/10]. [Summary]"
   Send via Twilio to owner_phone from clients table
   Store notification record with message + status
   ↓

10. REAL-TIME DASHBOARD UPDATE
    Supabase Realtime subscription pushes new call + lead to browser
    Dashboard updates call feed and leads count live
    ↓

COMPLETE: All data visible in dashboard, owner notified via SMS
```

### Owner Reply Flow

```
1. OWNER TEXTS BACK
   Owner receives SMS with lead info
   Types: "call back", "booked", "not interested", etc.
   ↓

2. TWILIO WEBHOOK RECEIVES SMS
   POST /api/webhooks/sms-inbound
   Body: From (owner phone), Body (text content)
   ↓

3. COMMAND PARSING
   Parse intent:
   - "call back" / "callback" → status = "contacted"
   - "booked" / "scheduled" → status = "booked"
   - "not interested" / "pass" / "lose" → status = "lost"
   - "offer 10% off" → add note to lead
   ↓

4. LEAD UPDATE
   Find most recent lead for this owner
   Update status, add notes if applicable
   ↓

5. NOTIFICATION LOG
   Update notification record with owner_response: "[text]"
   ↓

6. DASHBOARD REFLECTION
   Supabase Realtime pushes lead status update
   Dashboard kanban board updates immediately
   ↓

COMPLETE: Owner action captured, lead status changed, no dashboard navigation needed
```

## Patterns to Follow

### Pattern 1: Webhook-Driven Architecture

**What:** Events from external services (Retell, Twilio) trigger database updates and downstream actions.

**When:** Integrating with third-party voice/SMS providers that can't poll your system.

**Benefits:**
- Low latency — actions trigger immediately when events occur
- Stateless — webhooks are idempotent, no polling races
- Cost-efficient — pay only for actual events, not constant polling

**Example:**
```typescript
// /api/webhooks/retell
export async function POST(req: Request) {
  const event = await req.json();

  // Event-driven dispatch
  switch (event.event) {
    case 'call_started':
      await handleCallStarted(event);
      break;
    case 'call_ended':
      await handleCallEnded(event);
      break;
    case 'call_analyzed':
      await handleCallAnalyzed(event);
      break;
  }

  return Response.json({ received: true });
}
```

**Implementation notes:**
- Validate webhook secret in headers to prevent spoofing
- Return 200 OK immediately (don't wait for async processing)
- Offload heavy work (lead extraction, notification sending) to async jobs or queue
- Implement idempotency key check (Retell call_id) to prevent duplicate processing

### Pattern 2: Dynamic Prompt Injection

**What:** Build AI agent's system prompt from database at runtime, not hardcoded.

**When:** Serving multiple clients with different knowledge bases that change frequently.

**Benefits:**
- No redeployment needed to update knowledge base
- Clients can edit AI behavior through dashboard UI
- Prompt stays current with latest business info

**Example:**
```typescript
async function buildAgentPrompt(clientId: string): Promise<string> {
  // Fetch client config
  const client = await supabase
    .from('clients')
    .select('*, agent_config(*)')
    .eq('id', clientId)
    .single();

  // Fetch knowledge base (sorted by priority)
  const knowledge = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  // Build prompt string dynamically
  return `You are ${client.agent_config.agent_name}, receptionist for ${client.name}.

Personality: ${client.agent_config.personality}
Sales style: ${client.agent_config.sales_style}

Business Info:
${knowledge.map(k => `${k.category}: ${k.content}`).join('\n')}

Always: ${client.agent_config.custom_instructions}`;
}
```

**When to update:** Whenever knowledge base or agent config changes (hook in dashboard save)

### Pattern 3: Real-Time Dashboard via Supabase Subscriptions

**What:** Frontend subscribes to database tables; Supabase pushes updates to browser instantly.

**When:** Building dashboards that show live data without page refresh.

**Benefits:**
- No polling overhead
- Instant visibility when call ends or lead status changes
- Clean separation of concerns (database is single source of truth)

**Example:**
```typescript
// Frontend component
useEffect(() => {
  const subscription = supabase
    .from('calls')
    .on('*', payload => {
      // New call arrived or call updated
      setCallFeed(prev => [payload.new, ...prev]);
    })
    .subscribe();

  return () => supabase.removeSubscription(subscription);
}, []);
```

**Implementation notes:**
- Enable Realtime on tables in Supabase settings
- Use RLS policies to scope subscriptions (user only sees their org's data)
- Consider performance: limit subscriptions to specific filters (e.g., last 24 hours)

### Pattern 4: Multi-Tenant Data Scoping

**What:** All data queries include `client_id` filter; RLS policies enforce at database level.

**When:** Building a service with multiple independent customers.

**Benefits:**
- Defense in depth — logic + database layers enforce isolation
- Prevents accidental data exposure
- Clear data lineage (every record tied to a tenant)

**Example:**
```typescript
// API route — filter by org
const calls = await supabase
  .from('calls')
  .select('*')
  .in('client_id',
    // Only fetch clients owned by current user's org
    await getClientIdsForOrg(userId)
  );

// RLS Policy — database enforces
CREATE POLICY "org_admin_calls" ON calls
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients
      WHERE org_id IN (
        SELECT id FROM organizations
        WHERE owner_id = auth.uid()
      )
    )
  );
```

**Implementation notes:**
- RLS is the safety net; always include data scoping in queries as well
- Test with public roles to verify RLS works

### Pattern 5: Async Lead Analysis with LLM

**What:** After call ends, send transcript to Claude separately to extract structured data.

**When:** You need post-processing after an event (don't block webhook response).

**Benefits:**
- Webhook returns instantly (no timeout risk)
- Call data becomes immediately available; analysis completes shortly after
- Can retry failed analyses without losing call data

**Example:**
```typescript
// In webhook handler (returns immediately)
export async function handleCallEnded(event) {
  // Save raw call data first
  const call = await supabase.from('calls').insert({
    retell_call_id: event.call_id,
    transcript: event.transcript,
    status: 'completed'
  });

  // Trigger async analysis (don't wait)
  analyzeCallAsync(call.id, event.transcript);

  return { ok: true };
}

// Separate function (runs in background)
async function analyzeCallAsync(callId, transcript) {
  const analysis = await claude.messages.create({
    model: 'claude-opus-4-6',
    messages: [{
      role: 'user',
      content: `Analyze this call transcript:\n${transcript}\n\nExtract: {name, intent, urgency_1_10, lead_score_1_10, summary}`
    }]
  });

  const result = JSON.parse(analysis.content[0].text);

  // Update call with analysis
  await supabase.from('calls').update({
    summary: result.summary,
    lead_score: result.lead_score
  }).eq('id', callId);

  // Create lead if qualified
  if (result.lead_score >= 5) {
    await supabase.from('leads').insert({
      call_id: callId,
      name: result.name,
      urgency: result.urgency,
      lead_score: result.lead_score,
      notes: result.summary
    });
  }
}
```

**Implementation notes:**
- Use Supabase Edge Functions or a job queue for reliable async processing
- Implement retry logic with exponential backoff
- Log all analysis attempts for debugging

### Pattern 6: API Key Validation for Webhooks

**What:** Validate incoming webhook requests before trusting the data.

**When:** Receiving webhooks from external services.

**Benefits:**
- Prevents fake webhook injection (security)
- Identifies which service sent the webhook (routing)
- Detects misconfigured webhook endpoints (debugging)

**Example:**
```typescript
export async function POST(req: Request) {
  // Retell sends X-Retell-Signature header
  const signature = req.headers.get('X-Retell-Signature');

  if (!signature || !validateRetellSignature(signature, await req.text())) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Safe to trust this webhook
  const event = await req.json();
  // ... process event
}

function validateRetellSignature(signature: string, body: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RETELL_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  return signature === expected;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Blocking Webhook Handlers

**What:** Waiting for slow operations (API calls, heavy computation) inside webhook handler.

**Why bad:**
- Webhook timeout (usually 30-60 seconds)
- Retell will retry the webhook, creating duplicate processing
- Dashboard feels slow while webhook is processing

**Instead:**
- Return 200 OK immediately
- Offload work to background job (Supabase Edge Function, queue, cron)
- Store initial data (call record) first; enhance asynchronously

### Anti-Pattern 2: Hardcoding Knowledge Base in Agent Prompt

**What:** Baking business info into the Retell agent configuration at deploy time.

**Why bad:**
- Can't update without redeploying
- Different clients need different logic; hardcoding doesn't scale
- Each client config change requires engineering

**Instead:**
- Store knowledge base in Supabase
- Build prompt dynamically when agent initializes
- Let dashboard editors control the knowledge base

### Anti-Pattern 3: Fetching Full Call History on Every Dashboard Load

**What:** Query `SELECT * FROM calls` without pagination or limits.

**Why bad:**
- Slow queries as data grows
- Database connection exhaustion
- Transfers gigabytes of data unnecessarily

**Instead:**
- Paginate: fetch 50 calls, load more on scroll
- Filter by date range: "last 30 days" default
- Index aggressively (client_id, created_at)
- Use real-time subscriptions instead of polling

### Anti-Pattern 4: Storing Secrets in Vercel Environment

**What:** Putting Retell API key, Supabase key, etc. in Vercel UI directly.

**Why bad:**
- Anyone with dashboard access sees the secret
- No audit trail for secret rotation
- Can't easily revoke old secrets

**Instead:**
- Use Vercel's secret management (encrypted in transit/at rest)
- Rotate secrets on a schedule
- Use service accounts / API keys with minimal permissions
- Store Supabase service role key only on server side (never in browser)

### Anti-Pattern 5: Trusting Call Transcript Without Verification

**What:** Using Retell's call transcription directly without checking quality.

**Why bad:**
- Transcription errors corrupt lead data (wrong name, phone, intent)
- AI analysis is garbage-in-garbage-out
- User gets misleading information in dashboard

**Instead:**
- Let users edit transcripts in dashboard
- Flag low-confidence transcriptions (quality score)
- Implement human review for high-value leads
- Store original audio, allow manual transcription revision

### Anti-Pattern 6: No Retry Logic for Notifications

**What:** Send owner SMS once; if Twilio fails, no retry.

**Why bad:**
- Owner misses lead notification
- No visibility into which notifications failed
- Business loses opportunity

**Instead:**
- Store notification status in database
- Implement exponential backoff retry (Supabase scheduled functions)
- Monitor and alert on failed notification batches
- Fallback to email if SMS fails

## Scalability Considerations

### Current Architecture (MVP Phase)

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Concurrent Calls** | 5-10 concurrent Retell calls fine (free tier: 20 concurrent) | Upgrade Retell plan, monitor connection pooling | Retell handles at scale; monitor bandwidth |
| **Database** | Single Supabase instance, <100 TPS | May need connection pooling (PgBouncer); consider read replicas | Multi-region, sharding by client_id ranges |
| **Webhook Processing** | Vercel serverless functions auto-scale | Monitor cold start time; consider job queue | Dedicated backend service or SQS + workers |
| **Real-Time Subscriptions** | <1000 concurrent dashboard users | May hit Supabase realtime limits; implement filtering | Scale Supabase realtime or move to custom WebSocket |
| **Storage** | ~1GB call recordings + transcripts | ~100GB; consider archival to S3 | Multi-region S3, lifecycle policies |
| **Knowledge Base Context** | Fits in prompt easily (<8k tokens) | Consider RAG (retrieval-augmented generation) | Mandatory: embed knowledge, retrieve relevant entries only |

### Early Optimization Opportunities

**Phase 1+ (no urgency):**
- Add caching layer (Redis) for frequently accessed knowledge bases
- Implement vector embeddings + RAG for large knowledge bases (Phase 2)
- Use Vercel Analytics to monitor slow routes
- Set up database query monitoring (Supabase logs)

**Phase 2 (when needed):**
- Implement background job queue (Bull, RQ) for lead analysis
- Add CDN caching headers to dashboard assets
- Consider read replicas for high-volume analytics queries
- Implement connection pooling for database

**Phase 3+ (enterprise scale):**
- Multi-tenant database sharding
- Dedicated microservices for call analysis and notification dispatch
- Custom WebSocket server for real-time features
- Message queue for cross-service communication

## Build Order Implications

**Foundation (required first):**
1. Supabase schema + auth — everything else depends on this
2. Retell integration — core business logic
3. Call webhook handler — data ingestion pipeline
4. Dashboard skeleton — get data visible fast

**Call handling (closely coupled):**
5. Lead extraction (async) — depends on call storage
6. Notification service — depends on call + lead data
7. Owner reply handler — depends on notification service

**Dashboard (frontend, can progress in parallel):**
8. Call log view — depends on call webhook working
9. Lead management — depends on lead extraction
10. Knowledge base editor — depends on dynamic prompt building

**Enhancement (nice-to-have, low coupling):**
11. Advanced analytics — depends on mature call data
12. Agent config UI — low priority for MVP
13. Cron jobs (daily summary) — optional for Phase 1

## Sources

- **Project Instructions:** /Users/secretaria/ai-receptionist/CLAUDE.md (comprehensive architecture section with API endpoints, database schema, webhook flows)
- **Retell AI Architecture:** Documented in CLAUDE.md Section 8 (webhook events, agent configuration, call flow)
- **Supabase Realtime & RLS:** Standard Postgres-based multi-tenant patterns; documented in CLAUDE.md Section 13
- **Standard Voice API Patterns:** Twilio, Retell, OpenAI Realtime — webhook-driven, event-sourced architecture is industry standard
- **Next.js Webhook Best Practices:** Vercel documentation, verified against CLAUDE.md implementation guidance
