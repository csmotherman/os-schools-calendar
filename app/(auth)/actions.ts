'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function clean(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function raw(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}

async function getOrigin() {
  const headerStore = await headers()
  return process.env.NEXT_PUBLIC_SITE_URL ?? headerStore.get('origin') ?? 'http://localhost:3000'
}

function withError(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`
}

export async function register(formData: FormData) {
  const firstName = clean(formData.get('first_name'))
  const lastName = clean(formData.get('last_name'))
  const email = clean(formData.get('email')).toLowerCase()
  const password = raw(formData.get('password'))
  if (!firstName || !lastName || !email || !password) redirect(withError('/register', 'All fields are required.'))
  if (password.length < 10) redirect(withError('/register', 'Password must be at least 10 characters.'))

  const supabase = await createClient()
  const origin = await getOrigin()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName }, emailRedirectTo: `${origin}/auth/callback?next=/select-program` },
  })
  if (error) redirect(withError('/register', 'Unable to create the account. Please check your information and try again.'))
  if (data.session) redirect('/select-program')
  redirect(`/check-email?email=${encodeURIComponent(email)}`)
}

export async function login(formData: FormData) {
  const email = clean(formData.get('email')).toLowerCase()
  const password = raw(formData.get('password'))
  if (!email || !password) redirect(withError('/login', 'Email and password are required.'))
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(withError('/login', 'Unable to sign in with those credentials.'))
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function requestProgram(formData: FormData) {
  const programId = clean(formData.get('program_id'))
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!programId) redirect(withError('/select-program', 'Select a program.'))

  // Temporary diagnostic: prove which Auth user and profile the server action sees
  // immediately before invoking request_program_access(). Do not log tokens/cookies.
  const { data: accessState, error: accessStateError } = await supabase.rpc('get_my_access_state')
  console.info('Program request identity diagnostic:', {
    authUserId: user.id,
    authEmail: user.email ?? null,
    accessState,
    accessStateError,
    selectedProgramId: programId,
  })

  const { data: existing } = await supabase.from('program_memberships').select('id, status').eq('user_id', user.id).limit(1)
  if (existing && existing.length > 0) redirect('/pending')

  const { error } = await supabase.rpc('request_program_access', { target_program_id: programId })
  if (error) {
    console.error('Unable to submit program request:', error)
    redirect(withError('/select-program', 'Unable to submit that program request.'))
  }
  redirect('/pending')
}

export async function resubmitProgramRequest(formData: FormData) {
  const membershipId = clean(formData.get('membership_id'))
  if (!membershipId) redirect(withError('/pending', 'Missing program request.'))
  const supabase = await createClient()
  const { error } = await supabase.rpc('resubmit_program_request', { target_membership_id: membershipId })
  if (error) redirect(withError('/pending', error.message))
  redirect('/pending?resubmitted=1')
}

export async function requestPasswordReset(formData: FormData) {
  const email = clean(formData.get('email')).toLowerCase()
  if (!email) redirect(withError('/forgot-password', 'Email is required.'))
  const supabase = await createClient()
  const origin = await getOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` })
  if (error) redirect(withError('/forgot-password', 'Unable to process the password reset request.'))
  redirect('/forgot-password?sent=1')
}

export async function updatePassword(formData: FormData) {
  const password = raw(formData.get('password'))
  if (password.length < 10) redirect(withError('/reset-password', 'Password must be at least 10 characters.'))
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(withError('/reset-password', 'Unable to update the password.'))
  redirect('/dashboard')
}
