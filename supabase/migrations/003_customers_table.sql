-- 003: Customers table — CRM for business owners to manage their customers
-- Customers can be created manually or auto-converted from leads

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vip')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto_converted')),
  converted_from_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  last_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate customers per client by phone number
CREATE UNIQUE INDEX idx_customers_client_phone ON customers(client_id, phone)
  WHERE phone IS NOT NULL;

CREATE INDEX idx_customers_client_id ON customers(client_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_customers" ON customers
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );
