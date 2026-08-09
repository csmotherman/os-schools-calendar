'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

async function requireAdmin() {
  const access = await getAccessState()
  if (!access.user) redirect('/login')
  if (access.profile?.role !== 'ADMIN' || access.profile.account_status !== 'APPROVED') redirect('/dashboard')
}

export async function createProgram(formData: FormData) {
  await requireAdmin()
  const name = text(formData, 'name')
  if (!name) redirect('/admin/programs?error=Program%20name%20is%20required.')

  const supabase = await createClient()
  const { error } = await supabase.from('programs').insert({ name })
  if (error) redirect(`/admin/programs?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/admin/programs')
  redirect('/admin/programs?success=Program%20created.')
}

export async function setProgramActive(formData: FormData) {
  await requireAdmin()
  const programId = text(formData, 'program_id')
  const active = text(formData, 'active') === 'true'
  if (!programId) redirect('/admin/programs?error=Missing%20program.')

  const supabase = await createClient()
  const { error } = await supabase.from('programs').update({ active }).eq('id', programId)
  if (error) redirect(`/admin/programs?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/admin/programs')
  redirect('/admin/programs?success=Program%20updated.')
}
