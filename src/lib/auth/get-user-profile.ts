import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/domain'

export interface UserContext {
  userId: string
  email: string
  profile: UserProfile | null
  role: 'admin' | 'client_owner'
  clientId: string | null
  clientName: string | null
  ownerName: string | null
  agentName: string | null
  productsEnabled: string[]
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

  // Fetch client data
  let productsEnabled: string[] = []
  let clientName: string | null = null
  let ownerName: string | null = null
  let agentName: string | null = null
  let resolvedClientId = clientId

  if (role === 'client_owner' && clientId) {
    // Client owner: fetch their specific client and agent config
    const [{ data: client }, { data: agentConfig }] = await Promise.all([
      supabase
        .from('clients')
        .select('name, owner_name, products_enabled')
        .eq('id', clientId)
        .single(),
      supabase
        .from('agent_config')
        .select('agent_name')
        .eq('client_id', clientId)
        .single(),
    ])

    productsEnabled = (client?.products_enabled as string[] | null) ?? []
    clientName = client?.name ?? null
    ownerName = client?.owner_name ?? null
    agentName = agentConfig?.agent_name ?? null
  } else if (role === 'admin') {
    // Admin: fetch the first client for dashboard display
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, owner_name, products_enabled')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (client) {
      resolvedClientId = client.id
      productsEnabled = (client.products_enabled as string[] | null) ?? ['receptionist']
      clientName = client.name ?? null
      ownerName = client.owner_name ?? null

      const { data: agentConfig } = await supabase
        .from('agent_config')
        .select('agent_name')
        .eq('client_id', client.id)
        .single()
      agentName = agentConfig?.agent_name ?? null
    }
  }

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: profile as UserProfile | null,
    role,
    clientId: resolvedClientId,
    clientName,
    ownerName,
    agentName,
    productsEnabled,
  }
})
