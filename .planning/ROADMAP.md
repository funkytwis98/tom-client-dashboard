# AI Phone Receptionist — Roadmap

**Project:** AI Phone Receptionist B2B SaaS
**Milestone:** v1 (MVP)
**Updated:** 2026-03-01
**Mode:** Ship fast, iterate based on real calls with Interstate Tires

---

## Phases

- [x] **Phase 1: Inbound Call Loop & Owner Control** - AI answers calls, owner notified, dashboard visibility, agent configurable

---

## Phase Details

### Phase 1: Inbound Call Loop & Owner Control

**Goal:** Deliver a functional AI receptionist that answers inbound calls with business-specific knowledge, logs every conversation, captures leads, and notifies the business owner in real-time so they stay in control via text commands.

**Depends on:** Nothing (foundational phase)

**Requirements:** CALL-01, CALL-02, CALL-03, LEAD-01, LEAD-02, LEAD-03, NOTF-01, NOTF-02, DASH-01, DASH-02, DASH-03, DASH-04, AGNT-01, AGNT-02, AGNT-03

**Success Criteria** (what must be TRUE when phase completes):

1. **Calls are answered by AI with business-specific knowledge** — Customer calls business phone number → AI answers using Retell with client's knowledge base (services, pricing, hours, FAQs) injected into system prompt → conversation is natural and contextually accurate.

2. **Every call is captured and retrievable with full transcript** — Call ends → webhook stores call record (duration, recording URL, direction, caller number) + AI-generated transcript and summary in Supabase → owner can click call in dashboard and read/replay complete conversation.

3. **Owner receives SMS within 10 seconds of call ending** — Call completes → webhook triggers lead extraction and SMS generation → SMS sent to owner's phone with caller info, summary, and lead score before owner can hang up and move on.

4. **Owner can text commands to update lead status** — Owner receives "New call from Bob: wants tire rotation. Score 8/10." → Owner texts back "call back" → System parses command, updates lead status to "contacted" → Dashboard reflects status change immediately.

5. **Leads are extracted with name, contact info, service interest, and urgency score** — Call transcript analyzed → Claude extracts caller name, phone (if provided), what they called about, how urgent it is → Lead record created with 1-10 score for prioritization.

6. **Dashboard shows all calls searchable with transcript visible** — Admin logs into dashboard → clicks Calls page → sees paginated list of all calls filtered by date/direction/status → clicks any call to read full transcript, listen to recording, see sentiment and summary.

7. **Leads pipeline visible with status tracking and quick actions** — Admin clicks Leads page → sees Kanban or list view with columns: New, Contacted, Booked, Completed/Lost → can click lead and move it between statuses or click quick-action buttons without leaving the list.

8. **Knowledge base editor allows adding/editing AI training data by category** — Admin clicks Knowledge Base for a client → sees tabs for Services/Pricing/FAQ/Hours/Policies → can add new entry or edit existing → saves to database → next call AI uses updated information (no manual agent rebuild needed).

9. **AI personality, greeting, and voice are configurable per client** — Admin opens Agent Config for a client → can set agent name, custom greeting ("Thanks for calling Interstate Tires, this is Sarah"), personality description ("friendly but professional"), and voice selection from Retell library → saves to database and immediately affects next call.

10. **After-hours calls receive voicemail message and are logged as missed** — Call arrives outside business hours → AI plays voicemail message configured by admin → call logged with status "voicemail" → owner still notified with summary.

**Plans:** TBD (will be detailed in phase planning)

---

## Progress Tracker

| Phase | Requirements | Plans Complete | Status | Completed |
|-------|--------------|----------------|--------|-----------|
| 1. Inbound Call Loop | 15/15 | 0/TBD | Not started | — |

---

## Coverage Summary

**Total v1 requirements:** 15
**Mapped to phases:** 15
**Coverage:** 100% ✓

All requirements mapped, no orphans.

---

*Roadmap created: 2026-03-01*
