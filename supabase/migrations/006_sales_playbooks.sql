-- 006: Sales playbooks — per-client upsell/objection scripts for AI agent
CREATE TABLE sales_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('objection_handling', 'upsell_trigger', 'urgency_script', 'closing_technique')),
  title TEXT NOT NULL,
  trigger_phrase TEXT,
  response_script TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_playbooks_client_id ON sales_playbooks(client_id);
CREATE INDEX idx_sales_playbooks_category ON sales_playbooks(category);

ALTER TABLE sales_playbooks ENABLE ROW LEVEL SECURITY;

-- Admin access
CREATE POLICY "org_admin_playbooks" ON sales_playbooks
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Client owners can read their playbooks
CREATE POLICY "client_owner_read_playbooks" ON sales_playbooks
  FOR SELECT USING (client_id = get_user_client_id());

-- Public read for active playbooks (needed by Retell webhook to build agent prompt)
CREATE POLICY "public_active_playbooks" ON sales_playbooks
  FOR SELECT USING (is_active = TRUE);
