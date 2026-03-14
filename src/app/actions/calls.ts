'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markCallbackDone(callId: string, clientId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('calls')
    .update({ callback_completed: true })
    .eq('id', callId)
    .eq('client_id', clientId)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}/calls/${callId}`)
  revalidatePath(`/clients/${clientId}/calls`)
  revalidatePath('/calls')
  return { success: true }
}
