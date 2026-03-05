'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function resolveSystemError(errorId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('system_errors')
    .update({ resolved: true })
    .eq('id', errorId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { success: true }
}
