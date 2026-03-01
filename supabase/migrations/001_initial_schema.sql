-- ============================================================
-- AI Phone Receptionist — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- CORE TABLES
-- ============================================================

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
  follow_up_at TIMESTAMPTZ,                    -- When to follow up
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

-- Webhook idempotency log (prevents duplicate processing of Retell events)
CREATE TABLE webhook_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retell_call_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(retell_call_id, event_type)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Calls
CREATE INDEX idx_calls_client_id ON calls(client_id);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

-- Leads
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_status ON leads(status);

-- Knowledge Base
CREATE INDEX idx_knowledge_base_client_id ON knowledge_base(client_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);

-- Notifications
CREATE INDEX idx_notifications_client_id ON notifications(client_id);

-- Website Content
CREATE INDEX idx_website_content_client_id ON website_content(client_id);

-- Webhook log
CREATE INDEX idx_webhook_log_call_id ON webhook_processing_log(retell_call_id);

-- Clients (for quick lookups by phone and Retell agent)
CREATE INDEX idx_clients_owner_phone ON clients(owner_phone);
CREATE INDEX idx_clients_retell_agent_id ON clients(retell_agent_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_processing_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Organizations: owner can manage their own org
CREATE POLICY "org_owner_manage" ON organizations
  FOR ALL USING (owner_id = auth.uid());

-- Clients: admin can manage clients in their org
CREATE POLICY "org_admin_clients" ON clients
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Calls: admin can manage calls for their clients
CREATE POLICY "org_admin_calls" ON calls
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Leads: admin can manage leads for their clients
CREATE POLICY "org_admin_leads" ON leads
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Notifications: admin can manage notifications for their clients
CREATE POLICY "org_admin_notifications" ON notifications
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Knowledge Base: admin can manage their clients' knowledge base
CREATE POLICY "org_admin_knowledge_base" ON knowledge_base
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Knowledge Base: public read for active entries (needed for Retell webhook to build context)
CREATE POLICY "public_knowledge_base" ON knowledge_base
  FOR SELECT USING (is_active = TRUE);

-- Agent Config: admin can manage their clients' agent configs
CREATE POLICY "org_admin_agent_config" ON agent_config
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Website Content: admin can manage their clients' website content
CREATE POLICY "org_admin_website_content" ON website_content
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Website Content: public read for active content (needed for client sites)
CREATE POLICY "public_website_content" ON website_content
  FOR SELECT USING (is_active = TRUE);

-- Webhook processing log: service role bypass (webhooks use service role key — no auth user)
CREATE POLICY "service_role_webhook_log" ON webhook_processing_log
  FOR ALL USING (true);

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable Realtime on calls and leads tables for dashboard live updates
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
