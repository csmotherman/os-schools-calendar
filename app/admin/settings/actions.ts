'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import type { BlockedDateRestriction, DayLength, RequirementMetric, RequirementSeverity } from '@/types/database'

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function optionalNumber(value: string) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN
}

function route(path: string, kind: 'error' | 'success', message: string) {
  return `${path}?${kind}=${encodeURIComponent(message)}`
}

async function requireAdmin() {
  const access = await getAccessState()
  if (!access.user) redirect('/login')
  if (access.profile?.role !== 'ADMIN' || access.profile.account_status !== 'APPROVED') redirect('/dashboard')
  return access
}

export async function createSchoolYear(formData: FormData) {
  await requireAdmin()
  const name = text(formData, 'name')
  const startDate = text(formData, 'start_date')
  const endDate = text(formData, 'end_date')
  if (!name || !startDate || !endDate) redirect(route('/admin/settings/school-years', 'error', 'Complete all fields.'))

  const supabase = await createClient()
  const { error } = await supabase.from('school_years').insert({ name, start_date: startDate, end_date: endDate })
  if (error) redirect(route('/admin/settings/school-years', 'error', error.message))
  revalidatePath('/admin/settings/school-years')
  redirect(route('/admin/settings/school-years', 'success', 'School year created.'))
}

export async function setSchoolYearActive(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const active = text(formData, 'active') === 'true'
  const supabase = await createClient()
  const { error } = await supabase.from('school_years').update({ active }).eq('id', id)
  if (error) redirect(route('/admin/settings/school-years', 'error', error.message))
  revalidatePath('/admin/settings/school-years')
  redirect(route('/admin/settings/school-years', 'success', 'School year updated.'))
}

export async function createBlockedDate(formData: FormData) {
  const access = await requireAdmin()
  const schoolYearId = text(formData, 'school_year_id')
  const date = text(formData, 'date')
  const name = text(formData, 'name')
  const restrictionType = text(formData, 'restriction_type') as BlockedDateRestriction
  if (!schoolYearId || !date || !name || !['NO_SESSION', 'NO_ACTIVITY'].includes(restrictionType)) {
    redirect(route('/admin/settings/blocked-dates', 'error', 'Complete all blocked-date fields.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('blocked_dates').insert({ school_year_id: schoolYearId, date, name, restriction_type: restrictionType, created_by: access.user!.id })
  if (error) redirect(route('/admin/settings/blocked-dates', 'error', error.message))
  revalidatePath('/admin/settings/blocked-dates')
  redirect(route('/admin/settings/blocked-dates', 'success', 'Blocked date created.'))
}

export async function setBlockedDateActive(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const active = text(formData, 'active') === 'true'
  const supabase = await createClient()
  const { error } = await supabase.from('blocked_dates').update({ active }).eq('id', id)
  if (error) redirect(route('/admin/settings/blocked-dates', 'error', error.message))
  revalidatePath('/admin/settings/blocked-dates')
  redirect(route('/admin/settings/blocked-dates', 'success', 'Blocked date updated.'))
}

export async function createRequirement(formData: FormData) {
  await requireAdmin()
  const schoolYearId = text(formData, 'school_year_id')
  const calendarTypeId = text(formData, 'calendar_type_id')
  const metricType = text(formData, 'metric_type') as RequirementMetric
  const activityTypeId = text(formData, 'activity_type_id') || null
  const minimumCount = optionalNumber(text(formData, 'minimum_count'))
  const maximumCount = optionalNumber(text(formData, 'maximum_count'))
  const severity = text(formData, 'severity') as RequirementSeverity

  if (!schoolYearId || !calendarTypeId || !['SESSION_DAYS', 'ACTIVITY_DAYS'].includes(metricType) || !['BLOCK', 'WARNING'].includes(severity)) {
    redirect(route('/admin/settings/requirements', 'error', 'Complete all required fields.'))
  }
  if (Number.isNaN(minimumCount) || Number.isNaN(maximumCount) || (minimumCount === null && maximumCount === null)) {
    redirect(route('/admin/settings/requirements', 'error', 'Enter at least one valid minimum or maximum.'))
  }
  if (metricType === 'ACTIVITY_DAYS' && !activityTypeId) {
    redirect(route('/admin/settings/requirements', 'error', 'Choose an activity for an activity-day requirement.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('requirements').insert({
    school_year_id: schoolYearId,
    calendar_type_id: calendarTypeId,
    metric_type: metricType,
    activity_type_id: metricType === 'SESSION_DAYS' ? null : activityTypeId,
    minimum_count: minimumCount,
    maximum_count: maximumCount,
    severity,
  })
  if (error) redirect(route('/admin/settings/requirements', 'error', error.message))
  revalidatePath('/admin/settings/requirements')
  redirect(route('/admin/settings/requirements', 'success', 'Requirement created.'))
}

export async function setRequirementActive(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const active = text(formData, 'active') === 'true'
  const supabase = await createClient()
  const { error } = await supabase.from('requirements').update({ active }).eq('id', id)
  if (error) redirect(route('/admin/settings/requirements', 'error', error.message))
  revalidatePath('/admin/settings/requirements')
  redirect(route('/admin/settings/requirements', 'success', 'Requirement updated.'))
}

export async function createCalendarType(formData: FormData) {
  await requireAdmin()
  const code = text(formData, 'code').toUpperCase().replace(/\s+/g, '_')
  const name = text(formData, 'name')
  const daysPerWeek = Number(text(formData, 'days_per_week'))
  const dayLength = text(formData, 'day_length') as DayLength
  if (!code || !name || !Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7 || !['PART', 'FULL'].includes(dayLength)) {
    redirect(route('/admin/settings/calendar-types', 'error', 'Enter a valid calendar type.'))
  }
  const supabase = await createClient()
  const { error } = await supabase.from('calendar_types').insert({ code, name, days_per_week: daysPerWeek, day_length: dayLength })
  if (error) redirect(route('/admin/settings/calendar-types', 'error', error.message))
  revalidatePath('/admin/settings/calendar-types')
  redirect(route('/admin/settings/calendar-types', 'success', 'Calendar type created.'))
}

export async function setCalendarTypeActive(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const active = text(formData, 'active') === 'true'
  const supabase = await createClient()
  const { error } = await supabase.from('calendar_types').update({ active }).eq('id', id)
  if (error) redirect(route('/admin/settings/calendar-types', 'error', error.message))
  revalidatePath('/admin/settings/calendar-types')
  redirect(route('/admin/settings/calendar-types', 'success', 'Calendar type updated.'))
}

export async function createActivityType(formData: FormData) {
  await requireAdmin()
  const code = text(formData, 'code').toUpperCase().replace(/\s+/g, '_')
  const name = text(formData, 'name')
  const allowedWhenInSession = formData.get('allowed_when_in_session') === 'true'
  const allowedWhenNotInSession = formData.get('allowed_when_not_in_session') === 'true'
  if (!code || !name || (!allowedWhenInSession && !allowedWhenNotInSession)) {
    redirect(route('/admin/settings/activity-types', 'error', 'Activity must have a name/code and be allowed on at least one session state.'))
  }
  const supabase = await createClient()
  const { error } = await supabase.from('activity_types').insert({ code, name, allowed_when_in_session: allowedWhenInSession, allowed_when_not_in_session: allowedWhenNotInSession })
  if (error) redirect(route('/admin/settings/activity-types', 'error', error.message))
  revalidatePath('/admin/settings/activity-types')
  redirect(route('/admin/settings/activity-types', 'success', 'Activity type created.'))
}

export async function setActivityTypeActive(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const active = text(formData, 'active') === 'true'
  const supabase = await createClient()
  const { error } = await supabase.from('activity_types').update({ active }).eq('id', id)
  if (error) redirect(route('/admin/settings/activity-types', 'error', error.message))
  revalidatePath('/admin/settings/activity-types')
  redirect(route('/admin/settings/activity-types', 'success', 'Activity type updated.'))
}
