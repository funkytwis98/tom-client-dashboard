-- System errors table for monitoring critical failures
CREATE TABLE system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,          -- 'lead_extraction', 'owner_sms', 'retell_sync', 'twilio_webhook'
  message TEXT NOT NULL,
  detail TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_errors_created_at ON system_errors(created_at DESC);
CREATE INDEX idx_system_errors_error_type ON system_errors(error_type);
CREATE INDEX idx_system_errors_resolved ON system_errors(resolved);

ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

-- Full access for authenticated users (admin dashboard)
CREATE POLICY "admin_system_errors" ON system_errors
  FOR ALL USING (auth.role() = 'authenticated');
