-- ============================================================================
-- Migration 011: Interstate Tires Data Migration
-- ============================================================================
-- Purpose: Migrate Interstate Tires data from Tom's old DB (lsaqtasoouqztruoxxsb)
--          to the unified DB (wdebkubmcvapgrexypeq), remapping client_id FKs.
--
-- This file contains TWO sections that must be run separately:
--   Section 1: Run in Tom's OLD DB SQL Editor (extraction queries)
--   Section 2: Run in the UNIFIED DB SQL Editor (insertion/update queries)
--
-- IMPORTANT:
--   - Do NOT modify or delete anything in Tom's old DB
--   - Tom's old DB is kept as backup per project decisions
--   - Tom's `address` field is TEXT; convert to JSONB {"raw": "<text>"} format
--   - Tom's `phone` field maps to `phone_number` in unified schema (skip phone,
--     the client record likely already has phone_number from ai-receptionist side)
-- ============================================================================


-- ############################################################################
-- SECTION 1: EXTRACTION QUERIES
-- Run these in Tom's OLD DB SQL Editor:
-- https://supabase.com/dashboard/project/lsaqtasoouqztruoxxsb/sql
-- ############################################################################

-- Step 1.1: Get Interstate Tires client_id from Tom's DB
-- Save this ID -- you'll need it to filter the data below
SELECT id FROM clients WHERE slug = 'interstate-tires';

-- Step 1.2: Extract client record (social media config data)
-- Copy the output values -- you'll paste them into Section 2
SELECT
  slug, name, owner_name, phone, address,
  voice, voice_donts, audience, differentiators,
  hashtags, platforms, content_notes,
  post_target_weekly, nudge_frequency, auto_approve,
  auto_handle_comments, auto_handle_dms, weekly_recap,
  agent_name, location, google_rating, services, hours
FROM clients
WHERE slug = 'interstate-tires';

-- Step 1.3: Extract conversations
-- Copy all rows -- you'll paste them as INSERT values in Section 2
SELECT sender, message, message_sid, is_photo, photo_url, created_at
FROM conversations
WHERE client_id = '<PASTE_TOM_CLIENT_ID_HERE>'
ORDER BY created_at;

-- Step 1.4: Extract posts
-- Copy all rows -- you'll paste them as INSERT values in Section 2
SELECT status, caption, hashtags, platforms, photo_url, scheduled_for,
       content_type, source, created_at
FROM posts
WHERE client_id = '<PASTE_TOM_CLIENT_ID_HERE>'
ORDER BY created_at;

-- Step 1.5: Extract social connections
-- Copy all rows -- you'll paste them as INSERT values in Section 2
SELECT platform, status, page_access_token, page_id, ig_user_id,
       token_expires_at, account_name, account_id, connected_at
FROM social_connections
WHERE client_id = '<PASTE_TOM_CLIENT_ID_HERE>';


-- ############################################################################
-- SECTION 2: INSERTION / UPDATE QUERIES
-- Run these in the UNIFIED DB SQL Editor:
-- https://supabase.com/dashboard/project/wdebkubmcvapgrexypeq/sql
-- ############################################################################

-- Step 2.1: Get Interstate Tires client_id from the unified DB
-- Save this ID -- use it as the client_id for all INSERTs below
SELECT id FROM clients WHERE slug = 'interstate-tires';


-- Step 2.2: Update client record with social media config
-- Replace all <PASTE_...> placeholders with actual values from Step 1.2
UPDATE clients
SET
  products_enabled = '{receptionist, social_media}',
  social_media_config = jsonb_build_object(
    'voice', '<PASTE_VOICE>',
    'voice_donts', '<PASTE_VOICE_DONTS>',
    'audience', '<PASTE_AUDIENCE>',
    'differentiators', '<PASTE_DIFFERENTIATORS>',
    'hashtags', '<PASTE_HASHTAGS>',
    'platforms', '<PASTE_PLATFORMS>'::jsonb,
    'content_notes', '<PASTE_CONTENT_NOTES>',
    'post_target_weekly', '<PASTE_POST_TARGET_WEEKLY>',
    'nudge_frequency', '<PASTE_NUDGE_FREQUENCY>',
    'auto_approve', '<PASTE_AUTO_APPROVE>',
    'auto_handle_comments', '<PASTE_AUTO_HANDLE_COMMENTS>',
    'auto_handle_dms', '<PASTE_AUTO_HANDLE_DMS>',
    'weekly_recap', '<PASTE_WEEKLY_RECAP>',
    'social_agent_name', '<PASTE_AGENT_NAME>'
  ),
  location = '<PASTE_LOCATION>',
  google_rating = '<PASTE_GOOGLE_RATING>',
  services = '<PASTE_SERVICES>',
  hours = '<PASTE_HOURS>'
WHERE slug = 'interstate-tires';

-- NOTE on address: Tom's address is TEXT. If you want to migrate it, use:
-- UPDATE clients SET address = jsonb_build_object('raw', '<PASTE_ADDRESS_TEXT>') WHERE slug = 'interstate-tires';
-- Only do this if the unified DB's address is currently NULL for Interstate Tires.


-- Step 2.3: Insert conversations with remapped client_id
-- Replace <UNIFIED_CLIENT_ID> with the ID from Step 2.1
-- Replace the VALUES with actual data from Step 1.3
-- Each row gets a new UUID via gen_random_uuid()
INSERT INTO conversations (id, client_id, sender, message, message_sid, is_photo, photo_url, created_at)
VALUES
  -- Paste rows from Step 1.3 extraction here, one per line:
  -- (gen_random_uuid(), '<UNIFIED_CLIENT_ID>', '<sender>', '<message>', '<message_sid>', <is_photo>, <photo_url>, '<created_at>'),
  -- Example:
  -- (gen_random_uuid(), 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'owner', 'Hello!', 'SM123abc', false, null, '2025-01-15T10:30:00Z'),
  '<PASTE_FROM_SECTION_1_STEP_1.3>'
;


-- Step 2.4: Insert posts with remapped client_id
-- Replace <UNIFIED_CLIENT_ID> with the ID from Step 2.1
-- Replace the VALUES with actual data from Step 1.4
INSERT INTO posts (id, client_id, status, caption, hashtags, platforms, photo_url, scheduled_for, content_type, source, created_at)
VALUES
  -- Paste rows from Step 1.4 extraction here, one per line:
  -- (gen_random_uuid(), '<UNIFIED_CLIENT_ID>', '<status>', '<caption>', '<hashtags>', '<platforms>', '<photo_url>', '<scheduled_for>', '<content_type>', '<source>', '<created_at>'),
  '<PASTE_FROM_SECTION_1_STEP_1.4>'
;


-- Step 2.5: Insert social connections with remapped client_id
-- Replace <UNIFIED_CLIENT_ID> with the ID from Step 2.1
-- Replace the VALUES with actual data from Step 1.5
INSERT INTO social_connections (id, client_id, platform, status, page_access_token, page_id, ig_user_id, token_expires_at, account_name, account_id, connected_at)
VALUES
  -- Paste rows from Step 1.5 extraction here:
  -- (gen_random_uuid(), '<UNIFIED_CLIENT_ID>', '<platform>', '<status>', '<page_access_token>', '<page_id>', '<ig_user_id>', '<token_expires_at>', '<account_name>', '<account_id>', '<connected_at>'),
  '<PASTE_FROM_SECTION_1_STEP_1.5>'
;


-- Step 2.6: Add realtime publication for social media tables
-- (conversations, posts, alerts may already be added by migration 010)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'conversations already in supabase_realtime publication';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE posts;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'posts already in supabase_realtime publication';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'alerts already in supabase_realtime publication';
END $$;


-- ############################################################################
-- SECTION 3: VERIFICATION QUERIES
-- Run these in the UNIFIED DB to confirm migration succeeded
-- ############################################################################

-- Step 3.1: Verify row counts
-- Expected: conversations ~145, posts ~3, social_connections ~1
SELECT 'conversations' AS table_name, COUNT(*) AS row_count
FROM conversations
WHERE client_id = (SELECT id FROM clients WHERE slug = 'interstate-tires')
UNION ALL
SELECT 'posts', COUNT(*)
FROM posts
WHERE client_id = (SELECT id FROM clients WHERE slug = 'interstate-tires')
UNION ALL
SELECT 'social_connections', COUNT(*)
FROM social_connections
WHERE client_id = (SELECT id FROM clients WHERE slug = 'interstate-tires');

-- Step 3.2: Verify social_media_config is populated
SELECT
  slug,
  products_enabled,
  social_media_config,
  location,
  google_rating,
  services,
  hours
FROM clients
WHERE slug = 'interstate-tires';

-- Step 3.3: Verify products_enabled includes both products
SELECT slug, products_enabled
FROM clients
WHERE slug = 'interstate-tires'
  AND 'receptionist' = ANY(products_enabled)
  AND 'social_media' = ANY(products_enabled);
-- Should return 1 row. If 0 rows, products_enabled is not set correctly.
