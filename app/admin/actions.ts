'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessState } from '@/lib/auth/access'

function value(formData: FormData, key: string) {
  const entry = formData.get(key)
  return typeof entry === 'string' ? entry.trim() : ''
}

function withMessage(path: string, kind: 'error' | 'success', message: string) {
  return `${path}?${kind}=${encodeURIComponent(message)}`
}

async function requireAdmin() {
  const access = await getAccessState()
  if (!access.user) redirect('/login')
  if (access.profile?.role !== 'ADMIN' || access.profile.account_status !== 'APPROVED') {
    redirect('/dashboard')
  }
  return access
}

export async function approveAccess(formData: FormData) {
  await requireAdmin()
  const membershipId = value(formData, 'membership_id')
  if (!membershipId) redirect(withMessage('/admin/approvals', 'error', 'Missing membership.'))

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_approve_access', {
    target_membership_id: membershipId,
  })

  if (error) redirect(withMessage('/admin/approvals', 'error', error.message))
  revalidatePath('/admin')
  redirect(withMessage('/admin/approvals', 'success', 'Access approved.'))
}

export async function declineAccess(formData: FormData) {
  await requireAdmin()
  const membershipId = value(formData, 'membership_id')
  if (!membershipId) redirect(withMessage('/admin/approvals', 'error', 'Missing membership.'))

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_decline_access', {
    target_membership_id: membershipId,
  })

  if (error) redirect(withMessage('/admin/approvals', 'error', error.message))
  revalidatePath('/admin')
  redirect(withMessage('/admin/approvals', 'success', 'Access declined.'))
}

export async function disableUser(formData: FormData) {
  await requireAdmin()
  const userId = value(formData, 'user_id')
  if (!userId) redirect(withMessage('/admin/users', 'error', 'Missing user.'))

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_disable_user', { target_user_id: userId })
  if (error) redirect(withMessage('/admin/users', 'error', error.message))

  revalidatePath('/admin')
  redirect(withMessage('/admin/users', 'success', 'User disabled.'))
}

export async function approveCalendar(formData: FormData) {
  await requireAdmin()
  const calendarId = value(formData, 'calendar_id')
  const notes = value(formData, 'notes')
  if (!calendarId) redirect(withMessage('/admin/approvals', 'error', 'Missing calendar.'))

  const supabase = await createClient()
  const { error } = await supabase.rpc('approve_calendar', {
    target_calendar_id: calendarId,
    notes: notes || null,
  })
  if (error) redirect(withMessage('/admin/approvals', 'error', error.message))

  revalidatePath('/admin')
  redirect(withMessage('/admin/approvals', 'success', 'Calendar approved.'))
}

export async function requestCalendarChanges(formData: FormData) {
  await requireAdmin()
  const calendarId = value(formData, 'calendar_id')
  const notes = value(formData, 'notes')
  if (!calendarId || !notes) {
    redirect(withMessage('/admin/approvals', 'error', 'Review notes are required.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('request_calendar_changes', {
    target_calendar_id: calendarId,
    notes,
  })
  if (error) redirect(withMessage('/admin/approvals', 'error', error.message))

  revalidatePath('/admin')
  redirect(withMessage('/admin/approvals', 'success', 'Changes requested.'))
}
