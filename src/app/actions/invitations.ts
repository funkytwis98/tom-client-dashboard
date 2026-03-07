'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/auth/get-user-profile'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

/**
 * Invite a business owner to create an account scoped to their client.
 * Admin-only action.
 */
export async function inviteClientOwner(clientId: string, email: string) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Verify client exists and belongs to admin's org
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  if (!client) {
    return { error: 'Client not found' }
  }

  // Check for existing pending invitation
  const { data: existing } = await supabase
    .from('client_invitations')
    .select('id')
    .eq('client_id', clientId)
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return { error: 'An invitation is already pending for this email' }
  }

  const token = crypto.randomBytes(32).toString('hex')

  const { error } = await supabase
    .from('client_invitations')
    .insert({
      client_id: clientId,
      email,
      token,
      invited_by: ctx.userId,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/clients/${clientId}`)

  // Return the signup URL with token (admin can share this with the client owner)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set — required for invitation URLs')
  const signupUrl = `${baseUrl}/signup?token=${token}`

  return { signupUrl, clientName: client.name }
}

/**
 * Accept an invitation by token. Called during signup.
 * Uses service role to bypass RLS (the user doesn't have a profile yet).
 */
export async function acceptInvitation(token: string, userId: string) {
  const service = createServiceClient()

  // Find the invitation
  const { data: invitation, error: findError } = await service
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (findError || !invitation) {
    return { error: 'Invalid or expired invitation' }
  }

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    await service
      .from('client_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)
    return { error: 'This invitation has expired' }
  }

  // Get the client's org_id
  const { data: client } = await service
    .from('clients')
    .select('name, org_id')
    .eq('id', invitation.client_id)
    .single()

  if (!client) {
    return { error: 'Client not found' }
  }

  // Create user profile as client_owner
  const { error: profileError } = await service
    .from('user_profiles')
    .insert({
      user_id: userId,
      role: 'client_owner',
      org_id: client.org_id,
      client_id: invitation.client_id,
    })

  if (profileError) {
    return { error: profileError.message }
  }

  // Mark invitation as accepted
  await service
    .from('client_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { success: true, clientName: client.name }
}

/**
 * Validate an invitation token (for the signup page to show client name).
 */
export async function validateInvitationToken(token: string) {
  const service = createServiceClient()

  const { data: invitation } = await service
    .from('client_invitations')
    .select('email, expires_at, client_id')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (!invitation) {
    return { valid: false as const }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { valid: false as const }
  }

  const { data: client } = await service
    .from('clients')
    .select('name')
    .eq('id', invitation.client_id)
    .single()

  return {
    valid: true as const,
    email: invitation.email,
    clientName: client?.name ?? 'Your Business',
  }
}

/**
 * Revoke a pending invitation. Admin-only.
 */
export async function revokeInvitation(invitationId: string) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('client_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('status', 'pending')

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
