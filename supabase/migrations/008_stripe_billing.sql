-- Migration 008: Stripe billing support
-- Adds stripe_subscription_id to clients and creates webhook idempotency log

-- 1. Add stripe_subscription_id column to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Index for looking up clients by Stripe customer ID (used in webhook handler)
CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer_id ON clients(stripe_customer_id);

-- 3. Stripe webhook idempotency log — prevents duplicate event processing
CREATE TABLE IF NOT EXISTS stripe_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS: only service role can access webhook log (no user-facing access)
ALTER TABLE stripe_webhook_log ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role can read/write (RLS blocks all normal users)
