-- Website analytics tracking table
CREATE TABLE IF NOT EXISTS website_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'button_click', 'form_submit')),
  page_url TEXT NOT NULL,
  referrer TEXT,
  event_label TEXT,
  metadata JSONB,
  visitor_id TEXT, -- anonymous visitor fingerprint for approximate unique counts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_website_analytics_client_id ON website_analytics(client_id);
CREATE INDEX idx_website_analytics_created_at ON website_analytics(created_at DESC);
CREATE INDEX idx_website_analytics_client_event ON website_analytics(client_id, event_type, created_at DESC);

-- RLS: clients can only read their own analytics
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_read_own_analytics" ON website_analytics
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
    OR
    client_id IN (
      SELECT client_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Allow public inserts (from the tracking snippet via API route with service role)
-- The API route validates and rate-limits before inserting

-- Update subscription_tier to support new tiers
-- (The column is TEXT so it accepts new values without schema changes)

-- Update subscription_status to support 'past_due'
-- (Also TEXT, no schema changes needed)
