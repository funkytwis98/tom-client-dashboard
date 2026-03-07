-- Migration 009: Product tier and social media config on clients table
-- Date: 2026-03-07
-- Description: Adds product tier system (products_enabled), social media
--   configuration JSONB, and general business columns to the clients table
--   as part of the database schema unification effort.

-- =============================================================================
-- 1. Product tier system (DB-01)
-- =============================================================================
-- Tracks which products are enabled for each client.
-- Default is '{receptionist}' -- new clients get receptionist only.
-- No CHECK constraint per user decision (flexible for future product types).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS products_enabled TEXT[] DEFAULT '{receptionist}';

-- =============================================================================
-- 2. Social media config JSONB (DB-02)
-- =============================================================================
-- Stores all social media product configuration in a single JSONB field.
-- Follows the same pattern as the existing `settings JSONB DEFAULT '{}'` column.
--
-- Expected JSONB structure:
-- {
--   "voice":                 "string - brand voice description",
--   "voice_donts":           "string - what to avoid in voice",
--   "audience":              "string - target audience description",
--   "differentiators":       "string - what makes them unique",
--   "hashtags":              "string - default hashtags",
--   "platforms":             ["instagram", "facebook"],
--   "content_notes":         "string - content preferences",
--   "post_target_weekly":    5,
--   "nudge_frequency":       "Every 2 days",
--   "auto_approve":          false,
--   "auto_handle_comments":  true,
--   "auto_handle_dms":       true,
--   "weekly_recap":          true,
--   "social_agent_name":     "string - AI agent name for social media product"
-- }
ALTER TABLE clients ADD COLUMN IF NOT EXISTS social_media_config JSONB DEFAULT '{}'::jsonb;

-- =============================================================================
-- 3. General business columns (DB-02)
-- =============================================================================
-- These are general business info columns from Tom's schema, not
-- social-media-specific, so they are kept as flat columns.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS google_rating TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS services TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hours TEXT;

-- =============================================================================
-- 4. GIN index for product filtering (DB-01)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_products_enabled ON clients USING GIN (products_enabled);
