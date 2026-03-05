-- 005: RLS policies for client_owner role
-- Gives business owners scoped read access to their own client data
-- and write access to knowledge_base + customers

-- Helper function: get the client_id for the current user (if client_owner)
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'client_owner' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- clients: client owners can read their own client record
CREATE POLICY "client_owner_read_client" ON clients
  FOR SELECT USING (id = get_user_client_id());

-- calls: client owners can read their own calls
CREATE POLICY "client_owner_read_calls" ON calls
  FOR SELECT USING (client_id = get_user_client_id());

-- leads: client owners can read and update their own leads
CREATE POLICY "client_owner_read_leads" ON leads
  FOR SELECT USING (client_id = get_user_client_id());

CREATE POLICY "client_owner_update_leads" ON leads
  FOR UPDATE USING (client_id = get_user_client_id());

-- customers: client owners can fully manage their customers
CREATE POLICY "client_owner_all_customers" ON customers
  FOR ALL USING (client_id = get_user_client_id());

-- notifications: client owners can read their notifications
CREATE POLICY "client_owner_read_notifications" ON notifications
  FOR SELECT USING (client_id = get_user_client_id());

-- agent_config: client owners can read their agent config
CREATE POLICY "client_owner_read_agent_config" ON agent_config
  FOR SELECT USING (client_id = get_user_client_id());

-- knowledge_base: client owners can manage their own KB entries
CREATE POLICY "client_owner_all_knowledge_base" ON knowledge_base
  FOR ALL USING (client_id = get_user_client_id());
