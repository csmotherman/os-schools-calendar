'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function updateProfile(formData: FormData) {
  const access = await getAccessState()
  if (!access.user) redirect('/login')

  const firstName = text(formData, 'first_name')
  const lastName = text(formData, 'last_name')
  if (!firstName || !lastName) redirect('/profile?error=First%20and%20last%20name%20are%20required.')

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_own_profile_names', {
    new_first_name: firstName,
    new_last_name: lastName,
  })
  if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  redirect('/profile?success=Profile%20updated.')
}
