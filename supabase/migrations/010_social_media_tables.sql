-- Migration 010: Social media product tables
-- Date: 2026-03-07
-- Description: Creates the 7 tables for the social media product (conversations,
--   posts, alerts, social_connections, sms_queue, learned_data, file_store) with
--   RLS policies, indexes, and realtime publication as part of the database
--   schema unification effort.

-- =============================================================================
-- TABLE 1: conversations
-- =============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  message_sid TEXT,
  is_photo BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_conversations" ON conversations
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "client_owner_read_conversations" ON conversations
  FOR SELECT USING (client_id = get_user_client_id());

CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_message_sid ON conversations(message_sid);

-- =============================================================================
-- TABLE 2: posts
-- =============================================================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  caption TEXT,
  hashtags TEXT,
  platforms TEXT[] DEFAULT '{instagram,facebook}',
  photo_url TEXT,
  scheduled_for TIMESTAMPTZ,
  content_type TEXT,
  source TEXT,
  approval TEXT,
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_posts" ON posts
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "client_owner_read_posts" ON posts
  FOR SELECT USING (client_id = get_user_client_id());

CREATE POLICY "client_owner_update_posts" ON posts
  FOR UPDATE USING (client_id = get_user_client_id());

CREATE INDEX idx_posts_client_id ON posts(client_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_status ON posts(status);

-- =============================================================================
-- TABLE 3: alerts
-- =============================================================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_alerts" ON alerts
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "client_owner_read_alerts" ON alerts
  FOR SELECT USING (client_id = get_user_client_id());

CREATE INDEX idx_alerts_client_id ON alerts(client_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);

-- =============================================================================
-- TABLE 4: social_connections
-- =============================================================================
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  account_name TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  page_id TEXT,
  page_access_token TEXT,
  ig_user_id TEXT,
  permissions TEXT[] DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Only org admin has access (contains sensitive access tokens)
CREATE POLICY "org_admin_social_connections" ON social_connections
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_social_connections_client_id ON social_connections(client_id);
CREATE INDEX idx_social_connections_platform ON social_connections(client_id, platform);

-- =============================================================================
-- TABLE 5: sms_queue
-- =============================================================================
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  message_sid TEXT NOT NULL,
  body TEXT NOT NULL,
  from_number TEXT NOT NULL,
  is_photo BOOLEAN DEFAULT FALSE,
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_sms_queue" ON sms_queue
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "client_owner_read_sms_queue" ON sms_queue
  FOR SELECT USING (client_id = get_user_client_id());

-- Service role bypass for webhook handlers (same pattern as webhook_processing_log)
CREATE POLICY "service_role_sms_queue" ON sms_queue
  FOR ALL USING (true);

CREATE INDEX idx_sms_queue_client_id ON sms_queue(client_id);
CREATE INDEX idx_sms_queue_created_at ON sms_queue(created_at DESC);
CREATE INDEX idx_sms_queue_status ON sms_queue(status);
CREATE INDEX idx_sms_queue_message_sid ON sms_queue(message_sid);

-- =============================================================================
-- TABLE 6: learned_data
-- =============================================================================
CREATE TABLE learned_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT,
  confidence NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE learned_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_learned_data" ON learned_data
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "client_owner_read_learned_data" ON learned_data
  FOR SELECT USING (client_id = get_user_client_id());

CREATE INDEX idx_learned_data_client_id ON learned_data(client_id);
CREATE INDEX idx_learned_data_category ON learned_data(category);

-- =============================================================================
-- TABLE 7: file_store
-- =============================================================================
CREATE TABLE file_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE file_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_file_store" ON file_store
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "client_owner_read_file_store" ON file_store
  FOR SELECT USING (client_id = get_user_client_id());

CREATE INDEX idx_file_store_client_id ON file_store(client_id);

-- =============================================================================
-- REALTIME PUBLICATION
-- =============================================================================
-- Add conversations, posts, and alerts to realtime for live UI updates
-- (matches Tom's existing realtime subscriptions in useData.ts)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations, posts, alerts;
