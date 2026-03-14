-- Add callback tracking fields to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS callback_promised BOOLEAN DEFAULT FALSE;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS callback_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS callback_reminder_sent BOOLEAN DEFAULT FALSE;

-- Index for the callback reminder cron query
CREATE INDEX IF NOT EXISTS idx_calls_callback_pending
  ON calls (created_at)
  WHERE callback_promised = TRUE AND callback_completed = FALSE AND callback_reminder_sent = FALSE;
