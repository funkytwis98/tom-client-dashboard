-- 004: User profiles with roles + client invitation system
-- Enables client owners to log in with scoped access

-- User profiles: maps auth.users to roles and org/client scope
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'client_owner')),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_profile UNIQUE (user_id),
  CONSTRAINT client_owner_needs_client CHECK (
    role != 'client_owner' OR client_id IS NOT NULL
  )
);

-- Client invitations: token-based signup flow for business owners
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_client_id ON user_profiles(client_id);
CREATE INDEX idx_client_invitations_token ON client_invitations(token);
CREATE INDEX idx_client_invitations_email ON client_invitations(email);
CREATE INDEX idx_client_invitations_client_id ON client_invitations(client_id);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can see all profiles in their org
CREATE POLICY "admin_manage_profiles" ON user_profiles
  FOR ALL USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Users can see their own profile
CREATE POLICY "user_own_profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Admins can manage invitations for their org's clients
CREATE POLICY "admin_manage_invitations" ON client_invitations
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE org_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Anyone can read their own pending invitation by token (for signup flow)
-- This uses a service role bypass in the accept-invitation action
