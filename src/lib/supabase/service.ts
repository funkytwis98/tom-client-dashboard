import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/utils/env'

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in server-side code (webhook handlers, server actions, edge functions).
 * Never expose to the client bundle.
 */
export function createServiceClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
