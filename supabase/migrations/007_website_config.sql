-- ============================================================
-- Migration 007: Website Config
-- Adds website_config table for the templated website product.
-- website_content already exists from migration 001.
-- ============================================================

CREATE TABLE website_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  template_id TEXT NOT NULL DEFAULT 'bold',

  is_published BOOLEAN DEFAULT FALSE,

  -- Branding
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#f59e0b',
  accent_color TEXT DEFAULT '#10b981',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#111827',

  -- Typography
  font_heading TEXT DEFAULT 'Inter',
  font_body TEXT DEFAULT 'Inter',

  -- Assets
  logo_url TEXT,
  favicon_url TEXT,
  og_image_url TEXT,
  hero_image_url TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Analytics
  google_analytics_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_website_config_client_id ON website_config(client_id);

-- RLS
ALTER TABLE website_config ENABLE ROW LEVEL SECURITY;

-- Admin can manage their clients' website configs
CREATE POLICY "org_admin_website_config" ON website_config
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Client owners can read their own website config
CREATE POLICY "client_owner_website_config" ON website_config
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Public read for published configs (needed for public site rendering)
CREATE POLICY "public_website_config" ON website_config
  FOR SELECT USING (is_published = TRUE);

-- Add client_owner policy for website_content (missing from migration 005)
CREATE POLICY "client_owner_website_content" ON website_content
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );
