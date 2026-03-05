import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/domain'

export interface UserContext {
  userId: string
  email: string
  profile: UserProfile | null
  role: 'admin' | 'client_owner'
  clientId: string | null
}

/**
 * Get the current user's profile and role. Cached per-request via React.cache().
 * Returns null if not authenticated.
 */
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no profile exists yet, treat as admin (backwards-compatible with existing users)
  const role = profile?.role ?? 'admin'
  const clientId = profile?.client_id ?? null

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: profile as UserProfile | null,
    role,
    clientId,
  }
})
