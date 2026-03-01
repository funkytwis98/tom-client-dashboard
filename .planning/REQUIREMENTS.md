# Requirements: AI Phone Receptionist

**Defined:** 2026-03-01
**Core Value:** When a customer calls, an AI answers with business-specific knowledge, captures lead info, and notifies the owner — so no call goes unanswered and no lead is lost.

## v1 Requirements

### Call Handling

- [x] **CALL-01**: AI answers inbound calls with client-specific knowledge (services, pricing, hours, FAQs)
- [x] **CALL-02**: Every call is logged with transcript, duration, recording URL, and AI-generated summary
- [x] **CALL-03**: After-hours calls receive a voicemail message and are logged as missed

### Lead Management

- [x] **LEAD-01**: AI extracts lead info from call transcripts (name, phone, service interest, urgency)
- [x] **LEAD-02**: Each lead receives a 1-10 score based on call analysis
- [x] **LEAD-03**: Leads have status tracking: new, contacted, booked, completed, lost

### Owner Notifications

- [x] **NOTF-01**: Owner receives SMS alert for urgent leads (score 9-10) with callback number
- [x] **NOTF-02**: Owner receives daily SMS summary (total calls, new leads, booked appointments)

### Dashboard

- [x] **DASH-01**: Call log page with search/filter and click-through to full transcript + recording
- [x] **DASH-02**: Leads page with status pipeline view and quick actions (mark contacted/booked/lost)
- [x] **DASH-03**: Knowledge base editor with CRUD by category (services, pricing, FAQ, hours, policies)
- [x] **DASH-04**: Basic analytics showing calls today, leads this week, avg call duration

### AI Agent Config

- [x] **AGNT-01**: Agent personality, greeting, and sales style configurable per client
- [x] **AGNT-02**: Escalation rules configurable (when AI defers to owner)
- [x] **AGNT-03**: Voice selection from Retell's voice library

## v2 Requirements

### Owner Notifications

- **NOTF-03**: Owner receives SMS after every call with caller info, summary, and lead score
- **NOTF-04**: Owner can text back commands (call back, booked, not interested) to update lead status

### Multi-Tenancy

- **MTNT-01**: Admin auth via Supabase email/password login
- **MTNT-02**: RLS policies enforcing client data isolation by organization
- **MTNT-03**: Client management page to add/edit client businesses from dashboard

### Client Website

- **SITE-01**: Client website template pulling business data from Supabase
- **SITE-02**: Subdomain routing (client-slug.platform.com)
- **SITE-03**: Basic pages: Home, Services, About, Contact with "Call Now" button

### Advanced Features

- **ADVN-01**: Outbound follow-up calls to leads who didn't book
- **ADVN-02**: Sales playbook system with objection handling and upsell triggers
- **ADVN-03**: Advanced analytics (conversion funnels, peak hours heatmap, revenue attribution)
- **ADVN-04**: Stripe billing integration for client subscriptions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, mobile later |
| OAuth / magic link login | Email/password sufficient for MVP |
| Tom / OpenClaw integration | Phase 3, after product is proven standalone |
| Custom domains per client | Phase 2+, subdomain routing first |
| Client self-service dashboard | Phase 2, admin-only for now |
| Real-time chat | Not core to phone receptionist value |
| Video/image in knowledge base | Text-only sufficient for AI context |
| RAG / semantic search for KB | Start with prompt injection, optimize if KB exceeds context limits |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CALL-01 | 1 | Complete |
| CALL-02 | 1 | Complete |
| CALL-03 | 1 | Complete |
| LEAD-01 | 1 | Complete |
| LEAD-02 | 1 | Complete |
| LEAD-03 | 1 | Complete |
| NOTF-01 | 1 | Complete |
| NOTF-02 | 1 | Complete |
| DASH-01 | 1 | Complete |
| DASH-02 | 1 | Complete |
| DASH-03 | 1 | Complete |
| DASH-04 | 1 | Complete |
| AGNT-01 | 1 | Complete |
| AGNT-02 | 1 | Complete |
| AGNT-03 | 1 | Complete |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---

*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap creation*
