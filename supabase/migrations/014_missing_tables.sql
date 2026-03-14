-- Migration 014: Document tables that were created directly in Supabase
-- These tables already exist in production but had no migration file

-- brain_reflections: Stores Tom's self-reflection after each interaction
CREATE TABLE IF NOT EXISTS brain_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  confidence_score INTEGER,
  knowledge_gaps TEXT[],
  knowledge_used TEXT[],
  caller_sentiment TEXT,
  suggested_knowledge TEXT[],
  pattern_noticed TEXT,
  interaction_summary TEXT,
  trigger_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- contacts: Tracks caller/contact history per client
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  interaction_count INTEGER DEFAULT 1,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_summary TEXT,
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- usage_log: Tracks AI usage costs per interaction
CREATE TABLE IF NOT EXISTS usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost NUMERIC,
  trigger_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- learning_proposals: Weekly learning pipeline proposals for operator review
CREATE TABLE IF NOT EXISTS learning_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  proposed_entry JSONB,
  source_reflection_ids UUID[],
  status TEXT DEFAULT 'pending',
  dismissed_hash TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- task_runs: Scheduled task tracking (social posts, cron jobs)
CREATE TABLE IF NOT EXISTS task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  frequency_minutes INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_status TEXT DEFAULT 'pending',
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- unanswered_questions: Questions Tom couldn't answer during calls
CREATE TABLE IF NOT EXISTS unanswered_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id),
  question TEXT NOT NULL,
  context TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  answer TEXT,
  added_to_kb BOOLEAN DEFAULT FALSE,
  kb_entry_id UUID REFERENCES knowledge_base(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- signup_requests: Public signup portal submissions
CREATE TABLE IF NOT EXISTS signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to learned_data (also applied via Supabase migration)
ALTER TABLE learned_data ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE learned_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE learned_data ADD COLUMN IF NOT EXISTS evidence TEXT;

-- Add missing columns to knowledge_base (added directly, now documented)
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'fact';
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- RLS policies for new tables
ALTER TABLE brain_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE unanswered_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_requests ENABLE ROW LEVEL SECURITY;

-- Admin policies (org admins can manage all)
CREATE POLICY IF NOT EXISTS org_admin_brain_reflections ON brain_reflections FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())));

CREATE POLICY IF NOT EXISTS org_admin_contacts ON contacts FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())));

CREATE POLICY IF NOT EXISTS org_admin_usage_log ON usage_log FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())));

CREATE POLICY IF NOT EXISTS org_admin_learning_proposals ON learning_proposals FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())));

CREATE POLICY IF NOT EXISTS org_admin_task_runs ON task_runs FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())));

CREATE POLICY IF NOT EXISTS org_admin_unanswered_questions ON unanswered_questions FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())));

-- signup_requests: public insert (anyone can submit), authenticated read/update
CREATE POLICY IF NOT EXISTS public_insert_signup_requests ON signup_requests FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS authenticated_manage_signup_requests ON signup_requests FOR ALL
  USING (auth.role() = 'authenticated');

-- Client owner read policies
CREATE POLICY IF NOT EXISTS client_owner_read_brain_reflections ON brain_reflections FOR SELECT
  USING (client_id = get_user_client_id());

CREATE POLICY IF NOT EXISTS client_owner_read_contacts ON contacts FOR SELECT
  USING (client_id = get_user_client_id());

CREATE POLICY IF NOT EXISTS client_owner_read_usage_log ON usage_log FOR SELECT
  USING (client_id = get_user_client_id());

CREATE POLICY IF NOT EXISTS client_owner_read_learning_proposals ON learning_proposals FOR SELECT
  USING (client_id = get_user_client_id());

CREATE POLICY IF NOT EXISTS client_owner_read_unanswered_questions ON unanswered_questions FOR SELECT
  USING (client_id = get_user_client_id());
