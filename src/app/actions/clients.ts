'use server'

import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/types/domain'

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Client[]
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) return null
  return data as Client
}
