# Domain Pitfalls: AI Phone Receptionist

**Domain:** B2B SaaS voice AI service for small businesses
**Researched:** 2026-03-01
**Focus:** Retell AI + Supabase + Twilio integration for inbound call handling and owner notifications

## Critical Pitfalls

Mistakes that cause rewrites, lost customers, or dangerous data loss.

### Pitfall 1: Silent Call Failures (Call Looks "Handled" But Nothing Happened)

**What goes wrong:**
Calls appear to complete successfully in Retell's dashboard, owner gets an SMS, but the actual conversation failed silently:
- AI didn't load the knowledge base properly (network timeout, stale data)
- AI responded with generic fallbacks instead of business-specific answers
- Call audio was corrupted but webhook still fired
- Knowledge base was empty or malformed JSON, so AI had no context

Owner doesn't know anything went wrong until the customer calls back angry, or worse, never calls back.

**Why it happens:**
- Retell webhooks fire even if the call quality was poor or knowledge base fetch failed
- Webhook handler doesn't validate that AI actually received and used the knowledge base
- No canary monitoring (calling your own number to test end-to-end regularly)
- Knowledge base corruption isn't caught until a customer calls and AI gives wrong answers

**Consequences:**
- Lost leads (customers hang up on AI giving generic responses, don't call back)
- Reputational damage (customer thinks the business ignored them)
- No visibility into the problem until customer escalates
- Difficult to diagnose post-mortem (was it Retell, knowledge base, or network?)

**Prevention:**
1. **Webhook validation:** In your `/api/webhooks/retell` handler, fetch the knowledge base and verify it loaded successfully before marking the call as "handled"
   ```typescript
   // After call_ended event, verify the AI had context
   const knowledgeBase = await fetchClientKnowledge(clientId);
   if (!knowledgeBase || knowledgeBase.length === 0) {
     markCallAsError("Knowledge base missing during call");
     notifyAdminOfFailure(callId);
   }
   ```

2. **Health check calls:** Schedule automatic test calls (daily at 3 AM) to your own number with pre-recorded scenarios. Listen for correct business-specific responses.

3. **Knowledge base versioning:** When you update the knowledge base, bump a version number in Supabase. In the webhook, verify the Retell agent is using the current version.

4. **Transcript quality check:** If transcript is unusually short or AI response was too generic, flag it as a potential failure and have a human review before sending SMS to owner.

5. **Retell call metadata logging:** Store the full `call_metadata` from Retell's webhook. This includes confidence scores, interruption counts, and duration of silence. Low confidence calls deserve human review.

**Detection:**
- Knowledge base fetch failures in logs
- Calls with transcripts < 10 seconds (likely failed early)
- Owner SMS never arrives for completed calls
- Calls with AI responses matching fallback patterns only
- Retell dashboard shows "completed" but your database shows "error"

**When to address:** Phase 1 (MVP) — before first real call with Interstate Tires. This is your #1 risk.

---

### Pitfall 2: Knowledge Base Inflation & Context Window Exhaustion

**What goes wrong:**
As you add more knowledge base entries (services, pricing, FAQs, policies, team info), the AI's system prompt grows too large:
- Token limits exceeded → Claude truncates mid-conversation or refuses the call
- Latency increases → Retell hits timeout, call drops
- AI confuses or conflates similar entries (tire installation vs. repair vs. rotation)
- AI becomes verbose and less responsive (too much context to sift through)

Small business owner adds dozens of knowledge base entries thinking "more info = better AI" but the system degrades.

**Why it happens:**
- Easy to add knowledge base entries in the editor without thinking about context window
- No feedback loop showing how much "context budget" you're using
- Doesn't fail loudly — just gets slower and less accurate over time
- Temptation to stuff everything: full price list, detailed policies, competitor responses, team bios

**Consequences:**
- Degraded call quality (AI gives verbose or irrelevant responses)
- Increased latency (owner notices SMS arrives late)
- Retell API timeouts during peak call times
- Expensive token usage (if you're paying per token with Claude)

**Prevention:**
1. **Context budget indicator:** In the knowledge base editor, show remaining token count
   ```typescript
   const estimatedTokens = countTokens(buildAgentPrompt(clientId));
   const remaining = MAX_CONTEXT - estimatedTokens;
   renderWarning(remaining < 1000 ? "red" : remaining < 5000 ? "yellow" : "green");
   ```

2. **Prioritization enforcer:** Force entries to be ranked by importance. Only include top 30-40 entries in the prompt. Use RAG (embedding search) later if needed.

3. **Chunking strategy:** Split large knowledge bases:
   - Always include: greeting, hours, top 5 services, basic pricing
   - Load FAQ/policies only if the conversation direction suggests relevance
   - Never stuff everything in the system prompt from day one

4. **Regular audits:** Monthly review of knowledge base with the client: remove duplicates, outdated entries, low-value policies.

5. **Version snapshots:** When knowledge base is "finalized" for a client, lock it. New entries go into a "pending" queue for approval before adding to the agent.

**Detection:**
- Retell API calls start timing out
- Transcript becomes verbose or off-topic
- Owner complains "the AI didn't answer my pricing question, it talked about hours instead"
- Latency of SMS notifications increases

**When to address:** Phase 1 (MVP) — implement context budget before loading Interstate Tires knowledge base. Build the constraint in upfront.

---

### Pitfall 3: Broken Owner Notification Loop (Texts Don't Arrive or Owner Doesn't Know How to Reply)

**What goes wrong:**
Owner notification is the "secret weapon" per CLAUDE.md, but when it breaks, the system becomes useless:
- SMS to owner never arrives (Twilio network issue, number changed, opted out)
- SMS arrives hours later after the lead is cold
- Owner texts back but the reply isn't parsed correctly ("call back" → parsed as "call them back" literally)
- Owner replies to wrong number or shortcode and message gets lost
- Owner notifications are so frequent they get muted and never read them

Customer calls in with urgent need, AI captures it correctly, but owner never finds out.

**Why it happens:**
- Twilio delivery is not instant (can be 30-60 seconds, longer during network congestion)
- SMS reply parsing is fragile (owner typos "callback" instead of "call back")
- No feedback to owner showing the message was received and parsed
- No rate limiting or batching → flooding owner with texts, they disable notifications
- Carrier filters SMS from bulk senders (Twilio) as spam

**Consequences:**
- Leads go dead because owner doesn't respond in time
- Owner loses trust in the system ("I never got the call notification!")
- Owner replies but system doesn't understand (command not recognized, owner gets frustrated)
- SLA misses (owner promised callback within 2 hours, never knew about the lead)
- Reduced retention (owner cancels after a week because "it's not working")

**Prevention:**
1. **Delivery confirmation:** Don't rely on Twilio to confirm delivery. Implement:
   - Send SMS, wait 30 seconds, check if message delivered via Twilio status API
   - If not delivered within 60 seconds, resend or alert admin
   - Log failed deliveries with owner phone to debug issues

2. **Reply parsing robustness:** Build a command parser that handles typos and variations
   ```typescript
   const commands = {
     "call back": ["call back", "callback", "call them back", "call em", "ring them"],
     "not interested": ["not interested", "pass", "no thanks", "not a lead", "spam"],
     "booked": ["booked", "scheduled", "appointment set", "got it"],
     "pause": ["pause", "stop", "hold on", "no more texts"],
   };
   // Match best fit, don't reject if exact match fails
   ```

3. **Two-way confirmation:** After owner texts a command, immediately send confirmation SMS
   ```
   "✓ Got it — marked as 'call back'. We'll log when you reach them."
   ```
   This ensures owner knows their reply was understood.

4. **Rate limiting:** Don't send more than 1 SMS every 15 minutes per client, even if there are multiple calls. Batch updates:
   ```
   "📊 3 calls in the last 30 mins: John (tire rotation), Maria (brake service), Unknown (questions). Top lead: John — lead score 8/10."
   ```

5. **Onboarding call:** When first setting up a client, walk them through the SMS system:
   - Have them receive a test message and reply with a command
   - Verify they can receive SMS (some carriers block bulk senders)
   - Confirm their phone number is correct in the system
   - Set notification frequency preferences (every call, or batch summaries)

6. **SMS delivery attestation:** Log the owner's carrier response status (delivered, pending, failed). Track patterns by carrier/number (e.g., "ATT numbers consistently slow, Verizon instant").

**Detection:**
- Owner SMS delivery time > 60 seconds (check Twilio logs)
- Owner replies but system doesn't execute the command
- Owner says "I never got a text about that call" (but transcript shows it happened)
- High SMS failure rates for specific phone numbers or carriers
- Owner has to ask "how do I reply?" multiple times

**When to address:** Phase 1 (MVP), specifically Day 6-7 per CLAUDE.md. Test the full SMS loop with Interstate Tires owner before launch.

---

### Pitfall 4: Escalation Requests Stuck in Limbo

**What goes wrong:**
AI correctly identifies that it should escalate a call to the owner ("This customer is angry, I need a human") but:
- AI says "I'll have someone call you back" but no one knows a callback is needed
- Escalation request notification is lost or not prioritized
- No tracking of escalated calls — admin doesn't know which ones were deferred
- Owner calls the customer back, but no context about the original conversation
- Same customer calls back, AI doesn't know it was already escalated, loops the conversation

**Why it happens:**
- Escalation requests treated the same as normal leads (not prioritized)
- No "handoff context" passed to the owner (just the transcript, owner has to read the whole thing)
- No callback deadline or reminder if owner doesn't respond
- AI doesn't mark the call as "escalated" so it might try to re-escalate next time

**Consequences:**
- Customer feels ignored (AI promised callback, doesn't happen)
- Owner misses the context of why AI couldn't handle it (too angry, too complex, too urgent)
- Customer calls back, AI re-escalates, creating a loop
- Churn risk: customer decides the business is unresponsive

**Prevention:**
1. **Escalation flag & priority:** Calls marked as "escalation" get SMS with different tone and tag
   ```
   🚨 ESCALATION: John (tires) is upset — AI thinks needs human. Call back ASAP.
   Last message: "[customer quote]"
   ```
   Not "just another lead" — clearly flagged as urgent.

2. **Context extraction:** When AI escalates, extract the reason and customer sentiment
   ```typescript
   escalationMetadata: {
     reason: "Customer too angry for automated response",
     sentiment: "negative",
     unresolved_question: "Warranty dispute from 2024",
     recommended_action: "Offer goodwill gesture, listen to concern"
   }
   ```

3. **Callback deadline:** Set a 2-hour callback window for escalated calls
   - If owner hasn't called back in 2 hours, send reminder SMS
   - After 4 hours, notify admin to follow up with owner

4. **AI awareness:** When a repeat caller is detected, check if they were previously escalated
   - If yes, prepare context for the owner before they answer
   - AI says "Hold on, let me get [owner] on the line" (less friction)

5. **Escalation dashboard:** Quick "Escalations" tab in Command Center showing open escalations, time since escalation, whether owner has called back.

**Detection:**
- Owner says "I didn't know that call was escalated"
- Same customer calls back multiple times without resolution
- Escalation SMS delivered but owner didn't read
- Escalation callback never happens
- Calls marked as "escalated" but no follow-up action taken

**When to address:** Phase 1 (MVP), specifically in the initial agent config. Define escalation rules before launch.

---

### Pitfall 5: Data Loss on Webhook Failures (Retell → Supabase)

**What goes wrong:**
Retell sends a webhook to your `/api/webhooks/retell` endpoint, but the request fails before data is saved:
- Network hiccup between Retell and your server → retry logic times out → no call logged
- Supabase is temporarily down → webhook handler fails → call never recorded
- Database constraint violation (duplicate call ID) → call rejected silently
- Webhook handler crashes mid-insertion (e.g., malformed transcript) → partial data saved
- You redeploy code, old webhook retries in flight, new code rejects them

Result: Call happened, but zero trace in your system. Owner doesn't know. Lead is lost.

**Why it happens:**
- Retell webhooks are fire-and-forget (no callback verification from your side)
- Network requests can fail silently
- No idempotency check (webhook might fire twice, second one fails)
- Supabase connection pooling limits or timeouts during high call volume
- No dead-letter queue for failed webhook processing

**Consequences:**
- Missing call records (owner thinks no one called, but they did)
- Lost lead data (can't follow up on a lead that "never happened")
- Audit trail broken (regulators/franchise asks "how many calls?" — you undercount)
- Revenue loss (customer calls but you have no record, can't bill them)
- Debugging nightmare (Retell shows the call, your DB doesn't, no explanation)

**Prevention:**
1. **Idempotent webhook handler:** Always check if call already exists before inserting
   ```typescript
   const existing = await supabase
     .from('calls')
     .select('id')
     .eq('retell_call_id', event.call_id)
     .single();

   if (!existing.data) {
     // Insert new call
   } else {
     // Update existing call (second webhook for same call)
   }
   ```

2. **Webhook verification:** Sign Retell webhooks and verify signature on receipt
   ```typescript
   const signature = req.headers['x-retell-signature'];
   const verified = verifyRetellSignature(body, signature, RETELL_API_KEY);
   if (!verified) return 401;
   ```

3. **Transactional processing:** Use Supabase transactions to ensure either all data is saved or none
   ```typescript
   const result = await supabase.rpc('process_call_webhook', {
     call_id: event.call_id,
     transcript: event.transcript,
     // ... all fields at once
   });
   ```

4. **Failed webhook queue:** If webhook processing fails, save to a `webhook_failures` table for retry
   ```typescript
   try {
     await processWebhook(event);
   } catch (error) {
     await supabase.from('webhook_failures').insert({
       source: 'retell',
       event_id: event.call_id,
       payload: event,
       error: error.message,
       retry_count: 0
   });
   }
   ```

5. **Monitoring & alerts:** Log every webhook received and every insertion attempt. Alert if webhook rate drops (e.g., expecting 20 calls/day but only seeing 5 logged).

6. **Timeout handling:** Set explicit timeouts on Supabase operations (not infinite waits)
   ```typescript
   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new Error("Webhook processing timeout")), 10000)
   );
   await Promise.race([processWebhook(event), timeoutPromise]);
   ```

**Detection:**
- Retell call log shows 10 calls, your database has 7
- Webhook processing logs show "success" but data missing from DB
- Customer says they called, your transcript shows nothing
- Supabase shows occasional timeout errors around call processing times
- Same call_id appears multiple times (retries duplicating data)

**When to address:** Phase 1 (MVP), before loading Interstate Tires. Data integrity is non-negotiable.

---

### Pitfall 6: Knowledge Base Out of Sync With Reality

**What goes wrong:**
The knowledge base becomes stale or incorrect over time:
- Owner adds new service but forgets to update AI knowledge base → AI can't answer questions about it
- Pricing changes but old prices still in AI brain → customer gets quoted $50 for a service that's now $75
- Hours change for a holiday but AI still says "we close at 5" when they're actually open until 7
- Competitor info becomes outdated → AI gives wrong comparative info
- FAQ grows but old incorrect answers are never removed

Over weeks/months, AI and reality diverge. Customer frustration builds.

**Why it happens:**
- Knowledge base is separate from customer-facing systems (no single source of truth)
- Owner updates their website or schedule but forgets to tell you
- No notification when knowledge base is stale (no "last updated" indicator)
- Knowledge base editor doesn't connect to other systems (POS, scheduling, website)
- No version control or audit trail on knowledge base changes

**Consequences:**
- Customer calls and gets wrong info (pricing, availability)
- Owner blames AI for incompetence ("Your robot doesn't know we're open")
- Churn: customer trust erodes, owner cancels
- Reputation damage: customers tell friends "they quoted me the wrong price"
- Lost opportunities: customers think they're closed when they're open

**Prevention:**
1. **Source of truth link:** If possible, connect knowledge base to client's actual systems (Google Business, calendar, POS)
   - Fetch hours from Google Business automatically
   - Pull services from their website
   - Keep pricing in sync with invoice system

2. **Staleness indicator:** Show when each knowledge base entry was last updated
   - If > 30 days old and marked as "critical" (hours, pricing), flag it as stale
   - Send reminder to owner to review annually

3. **Change log:** Every knowledge base edit logs who changed what and when
   ```
   [2026-01-15 09:30] Sarah updated "Tire rotation pricing" from "$40" to "$45" (markup: +12.5%)
   [2026-01-15 09:35] System auto-detected change, will prompt to test before activation
   ```

4. **Testing workflow:** When owner edits a critical entry (pricing, hours), require them to test with a sample call before the change goes live
   - Offer a "test call" where they call their own number with the new knowledge
   - AI should quote the new price, confirm new hours, etc.
   - Owner approves or reverts

5. **Scheduled validation:** Weekly, run a cron job that:
   - Fetches Google Business info for the client (hours, phone, services)
   - Compares with knowledge base
   - Alerts if there's a mismatch

6. **Snapshot versioning:** When knowledge base is finalized, snapshot it with a version number
   - AI uses the active version
   - If customer complains about outdated info, you can show exactly when it was last updated
   - Easier to audit and explain discrepancies

**Detection:**
- Customer calls and says "You quoted me $50 but your website says $40"
- Owner complains "The AI said we're closed when we were open"
- Knowledge base entries are > 2 months old
- Retell agent was updated but knowledge base wasn't synced
- Customer says "different price when I talked to your AI vs. your website"

**When to address:** Phase 1 (MVP), in the knowledge base editor. Build staleness indicators from day one, not as an afterthought.

---

### Pitfall 7: Owner Gets Overwhelmed & Stops Using the System

**What goes wrong:**
Owner is excited at launch, but after a week:
- Receiving 30+ SMS per day (one per call), finds them overwhelming
- Doesn't have time to read the dashboard
- Misses important leads because critical ones look the same as spam
- Turns off notifications entirely ("too much noise")
- Falls back to just reading the phone log when they have time

System becomes a nuisance instead of helpful.

**Why it happens:**
- Notification defaults are too aggressive (every single call → SMS)
- No filtering or batching → owner drowns in volume
- No way to snooze or quiet hours (business gets busy, owner turns off phone)
- Dashboard is too much info, not enough signal
- Owner doesn't know they can customize notification frequency

**Consequences:**
- Owner disengages, stops using dashboard
- Leads aren't followed up on because owner didn't see them
- Owner complaints: "This is too much"
- Churn: owner cancels after 2-3 weeks

**Prevention:**
1. **Smart batching defaults:** Out of the box, batch notifications
   - First call of the hour → immediate SMS
   - Next 2 calls in same hour → batch into one message at the top of the hour
   - New leads (score > 7) → always immediate SMS
   - Low-value calls (score < 4) → batch into daily summary only

2. **Quiet hours:** Let owner set quiet hours in settings
   - Business hours 9-5: immediate SMS for new leads, batch others
   - After hours: batch everything into one overnight summary
   - Owner can override for urgent calls

3. **Lead scoring threshold:** Owner can set "only notify me for leads with score > X"
   - Low score = might be info-seeker, not buyer
   - Owner tunes threshold based on business type

4. **Dashboard notifications:** In the dashboard, highlight high-value leads with visual emphasis
   - New hot lead: red badge
   - Medium lead: yellow badge
   - Info request: gray badge
   - Owner can quickly scan and prioritize

5. **Onboarding calibration:** In the first week, work with owner to calibrate
   - Walk through 5 real calls together
   - Owner decides what gets notified
   - Set preferences based on their feedback
   - Follow up: "Is the notification frequency working for you?"

6. **Check-in reminders:** Send a weekly one-time digest showing engagement
   ```
   "📊 This week: 15 calls, 8 leads, you reached out to 6. Nice work!
    💡 Tip: Set quiet hours after 5 PM to reduce SMS. Go to Settings."
   ```

**Detection:**
- Owner stops logging into dashboard after first week
- Owner disables SMS notifications within 3 days
- Owner complaints about "too many texts"
- Leads not followed up on despite SMS delivery confirmed
- Owner says "I have too many notifications"

**When to address:** Phase 1 (MVP), in Day 4 when building owner notifications. Default to conservative, let owner opt into more.

---

### Pitfall 8: Call Quality Degrades & No One Notices Until Customers Complain

**What goes wrong:**
The AI's conversation quality slowly degrades but there's no metric to detect it:
- AI starts repeating itself ("Let me get that info for you" on every turn)
- AI misunderstands caller intent (caller says "brake pads" → AI hears "tie rods")
- AI gets stuck in loops (same question asked 3 times, AI gives same answer, customer hangs up)
- Sentiment analysis shows "negative" but no human reviews the actual transcript
- Knowledge base becomes confusing (similar entries conflict with each other)

Owner first hears about it when a customer leaves a bad review, or doesn't call back.

**Why it happens:**
- No per-call quality score visible to admin
- Transcripts auto-stored but rarely reviewed
- Retell's sentiment is used but not acted upon
- No QA process for reviewing bad calls
- No trend detection (is call quality degrading over time?)

**Consequences:**
- Poor first impressions (customer thinks business is incompetent)
- Lost repeat business (customer doesn't call back)
- Negative reviews or complaints
- Churn: owner realizes AI isn't working, cancels
- Difficult to diagnose (no clear root cause of quality loss)

**Prevention:**
1. **Call quality scoring:** After every call, calculate a quality score
   ```
   score = (
     transcript_length_ok ? +20 : -20 +
     sentiment_not_negative ? +20 : -30 +
     ai_asked_followups ? +15 : 0 +
     caller_agreed_to_callback ? +25 : 0 +
     no_repeated_questions ? +20 : -10 +
     call_duration > 30_seconds ? +10 : -5
   ) / 100
   ```
   Show in dashboard as a 1-10 score. Flag calls < 5.

2. **Auto-review of poor calls:** Any call with quality score < 5 gets flagged for human review
   - Create a "Poor Calls" tab in dashboard
   - Link to transcript and audio
   - Admin listens and marks the issue (AI confused, knowledge base gap, technical issue)

3. **Trend detection:** Weekly report showing:
   - Avg call quality last week vs. previous week
   - % of calls with quality score < 6
   - Alert if trend is downward

4. **Knowledge base conflict detection:** When editing knowledge base, check for conflicts
   ```
   You added "Tire installation: $40" but existing entry says "Installation: $35-$45"
   Are these the same service? (Helps avoid AI confusion)
   ```

5. **Sentiment-triggered review:** Any call with "negative" sentiment automatically gets human review queue
   - Don't wait for owner complaint
   - Understand what went wrong while it's fresh

6. **Sample QA:** Pick 5 random calls per client per week, listen to them
   - Catch quality issues early before they become a pattern
   - Use as feedback to tune the AI's knowledge base

**Detection:**
- Call quality scores trending down
- Multiple calls with similar negative feedback (AI didn't answer pricing question)
- Owner says "Customers are complaining the AI didn't help"
- High abandon rate (short calls, customer hangs up)
- Negative sentiment in > 20% of calls

**When to address:** Phase 1 (MVP), in dashboard analytics. Build quality scoring before Interstate Tires launch.

---

## Moderate Pitfalls

### Pitfall 9: Call Recording & Storage Liability

**What goes wrong:**
You're recording every call, but:
- No clear consent flow (caller doesn't know they're being recorded)
- Recording stored insecurely, exposed to unauthorized access
- No retention policy (3-year-old calls still stored, GDPR violation)
- No way for callers to request deletion (right to be forgotten)
- Transcripts contain PII (credit card, SSN) stored unencrypted

Legal/regulatory risk if data is breached or caller sues.

**Prevention:**
1. Record only what's needed (disable video if present)
2. Add upfront disclosure: "This call will be recorded for quality assurance"
3. Encrypt recordings at rest and in transit
4. Set automatic deletion policy (e.g., 60 days after call)
5. Implement GDPR compliance (ability to request, verify, and delete personal data)
6. Store recordings separately from transcripts; transcripts can be redacted

**When to address:** Phase 1 (MVP) — before first Interstate Tires call.

---

### Pitfall 10: Retell AI API Changes Break Your System

**What goes wrong:**
Retell makes an API change (payload format, webhook fields, deprecated fields) and your system breaks without warning:
- Webhook handler expects `call_duration` field, Retell changes it to `duration_seconds`
- `call_ended` event structure changes, parsing logic fails
- Authentication method changes, API calls start failing

Calls still happen, but data doesn't get logged. Outage with no warning.

**Prevention:**
1. Monitor Retell changelog and release notes closely
2. Subscribe to Retell's status page for incidents
3. Add schema validation on webhook payloads (ensure expected fields exist)
   ```typescript
   const schema = z.object({
     call_id: z.string(),
     call_duration: z.number().or(z.undefined()), // nullable if renamed
     // ...
   });
   const validated = schema.parse(event); // Throws if validation fails
   ```
4. Implement graceful degradation (if a field is missing, use a sensible default)
5. Version your webhook handler (accept both old and new formats during transition)
6. Test against Retell's sandbox before deploying to production

**When to address:** Phase 1 (MVP) — add input validation to webhook handler day 3-5.

---

### Pitfall 11: Multi-Tenancy Data Leaks

**What goes wrong:**
Because the system handles multiple clients, a bug in Supabase RLS or your query logic leaks data:
- Interstate Tires admin queries leads, accidentally sees another client's leads
- RLS policy is too permissive, allows cross-tenant access
- API endpoint doesn't filter by `client_id` before returning results
- Logging includes secrets/keys that shouldn't be in logs

Owner of Client A can see Client B's calls.

**Prevention:**
1. **RLS first:** Every query must be filtered by the authenticated user's organization/client
2. **Query validation:** Before any SELECT, verify WHERE clause includes client_id
   ```typescript
   // Bad: doesn't filter by client
   const calls = await supabase.from('calls').select('*');

   // Good: filters by authenticated user's client
   const calls = await supabase
     .from('calls')
     .select('*')
     .eq('client_id', userClientId)
   ```
3. **RLS policies tested:** Write tests that verify RLS blocks cross-tenant access
4. **Secrets rotation:** Don't log API keys, auth tokens, Supabase keys
5. **Regular audit:** Periodically review RLS policies to ensure they're not too permissive

**When to address:** Phase 1 (MVP) — build RLS policies in section 7 of CLAUDE.md before any data is stored.

---

### Pitfall 12: Retell Phone Number Costs Spiral Unexpectedly

**What goes wrong:**
You're charged on a per-minute basis, and costs grow faster than expected:
- A single angry customer has a 45-minute call (your profit margin on that client: negative)
- Retell's pricing model changes mid-month (no warning)
- Call quality issues cause customers to call back multiple times, doubling your per-customer cost
- You didn't realize Retell charges for incomplete/failed calls too (even 2-second attempted connections)

Profitability model breaks.

**Prevention:**
1. **Clear Retell cost model:** Understand Retell's billing exactly
   - Per-minute rate
   - Do failed/short calls cost?
   - Do simultaneous calls cost more?
   - Volume discounts?
2. **Per-call cost tracking:** Every call logs its cost
   ```typescript
   callCost = duration_seconds / 60 * RETELL_RATE_PER_MINUTE;
   ```
3. **Client profitability dashboard:** Show real cost vs. revenue for each client
   ```
   Client: Interstate Tires
   Revenue: $299/mo
   Retell cost: $140/mo
   Other costs: $40/mo
   Profit: $119/mo
   ```
4. **Call duration limits:** If a call exceeds 30 minutes, escalate to human (prevent long rambling calls)
5. **Failed call detection:** Monitor for patterns of short/failed calls (might indicate quality issue)

**When to address:** Phase 1 (MVP) — track costs from day 1, validate with Interstate Tires real usage.

---

## Minor Pitfalls

### Pitfall 13: Search & Filter Performance Degrades as Call History Grows

**What goes wrong:**
Dashboard works great with 50 calls. With 5,000 calls, searching for calls by date becomes slow. Leads page lags.

Not critical, but annoying.

**Prevention:**
1. Index frequently-searched columns: `client_id`, `created_at`, `status`
2. Implement pagination (load 20 calls at a time, not all 5,000)
3. Use Supabase's built-in full-text search for transcripts
4. Archive old calls (> 1 year) to a separate table for compliance without slowing daily work

**When to address:** Phase 2 (after MVP is stable).

---

### Pitfall 14: Dashboard Doesn't Show Real-Time Updates When Owner Uses Multiple Devices

**What goes wrong:**
Owner checks dashboard on phone, sees 3 new leads. Owner switches to desktop, sees 3 new leads again. Confusing.

Not mission-critical, but frustrating.

**Prevention:**
Use Supabase realtime subscriptions to push updates across all user devices. When a call completes, all open dashboards update immediately.

**When to address:** Phase 1 (MVP) — Supabase realtime is built-in, not hard to wire up.

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| **Phase 1** | Webhook reliability | Silent call failures, data loss | Idempotent handlers, failed webhook queue, monitoring |
| **Phase 1** | Knowledge base setup | Stale/conflicting info, context bloat | Staleness indicators, conflict detection, context budgets |
| **Phase 1** | Owner notifications | SMS delivery, reply parsing, overwhelming volume | Delivery confirmation, robust parsing, smart batching, quiet hours |
| **Phase 1** | Call quality | No visibility into poor calls | Quality scoring, auto-review of low scores |
| **Phase 1** | Agent config | Escalation requests missed | Clear escalation flagging, callback deadlines, dashboard for open escalations |
| **Phase 2** | Outbound follow-ups | Over-calling customers, ignored opt-outs | Frequency caps, respect "do not call" flags, customer feedback loop |
| **Phase 2** | Sales playbook | AI becomes pushy, loses authenticity | Tone tuning, A/B testing playbooks, customer sentiment monitoring |
| **Phase 2** | Website integration | Content sync failures, outdated info | Source-of-truth linking, scheduled validation |
| **Phase 3** | Tom integration | Different user expectations, identity confusion | Clear separation of phone vs. social module, unified analytics careful |

---

## Sources & Research Notes

**HIGH CONFIDENCE:**
- CLAUDE.md (official project instructions) — core flows, tech stack, stated value
- Retell AI documentation (implicit from CLAUDE.md) — webhook structure, call events, pricing

**MEDIUM CONFIDENCE:**
- General voice AI best practices (training data) — context window, latency, quality scoring
- Small business SaaS failure modes (training data) — notification fatigue, feature bloat, integration brittleness
- Telephony system architecture patterns (training data) — idempotent webhooks, call state machines, escalation handling

**NOT VERIFIED (would benefit from deeper research):**
- Specific Retell AI webhook retry behavior and timeouts (should verify in their docs)
- Twilio SMS delivery times under load (should test in Phase 1)
- Typical conversation turn counts for phone receptionist calls (Interstate Tires can provide real data)
- Context window exhaustion impact on Claude LLM (should benchmark during Phase 1)

---

## Summary

The highest-risk pitfalls for this project are:

1. **Silent call failures** — calls look successful but nothing useful happened
2. **Knowledge base sync/staleness** — AI and reality diverge over time
3. **Broken owner notification loop** — SMS doesn't arrive or owner replies aren't understood
4. **Escalation requests missed** — urgent issues stuck in limbo
5. **Data loss on webhook failures** — call happens but zero trace

All five are addressable in Phase 1 (MVP) with proper engineering discipline. Start testing with Interstate Tires ASAP to validate assumptions.
