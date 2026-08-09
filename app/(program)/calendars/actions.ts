'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { generateCalendarDays, normalizeWeekdays } from '@/lib/calendar/generate'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function errorPath(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`
}

async function requireApprovedProgramUser() {
  const access = await getAccessState()
  if (!access.user) redirect('/login')
  if (access.profile?.role === 'ADMIN' && access.profile.account_status === 'APPROVED') return access
  if (access.profile?.account_status !== 'APPROVED' || !access.approvedMembership) redirect('/pending')
  return access
}

export async function createCalendar(formData: FormData) {
  const access = await requireApprovedProgramUser()
  const schoolYearId = text(formData, 'school_year_id')
  const calendarTypeId = text(formData, 'calendar_type_id')
  const startDate = text(formData, 'start_date')
  const endDate = text(formData, 'end_date')
  const sessionWeekdays = normalizeWeekdays(formData.getAll('session_weekdays').map(Number).filter(Number.isInteger))
  if (!schoolYearId || !calendarTypeId || !startDate || !endDate) redirect(errorPath('/calendars/new', 'Complete all calendar fields.'))
  const programId = access.approvedMembership?.program_id
  if (!programId) redirect(errorPath('/calendars/new', 'No approved program is available.'))
  const supabase = await createClient()
  const [{ data: schoolYear }, { data: calendarType }] = await Promise.all([
    supabase.from('school_years').select('id, start_date, end_date, active').eq('id', schoolYearId).maybeSingle(),
    supabase.from('calendar_types').select('id, days_per_week, active').eq('id', calendarTypeId).maybeSingle(),
  ])
  if (!schoolYear?.active || !calendarType?.active) redirect(errorPath('/calendars/new', 'Select an active school year and calendar type.'))
  if (startDate < schoolYear.start_date || endDate > schoolYear.end_date || startDate > endDate) redirect(errorPath('/calendars/new', 'Calendar dates must fall inside the selected school year.'))
  if (sessionWeekdays.length !== calendarType.days_per_week) redirect(errorPath('/calendars/new', `This calendar type requires exactly ${calendarType.days_per_week} normal session weekdays.`))
  const { data: blockedDates } = await supabase.from('blocked_dates').select('date, restriction_type').eq('school_year_id', schoolYearId).eq('active', true)
  let generatedDays
  try { generatedDays = generateCalendarDays({ startDate, endDate, sessionWeekdays, blockedDates: blockedDates ?? [] }) }
  catch (error) { redirect(errorPath('/calendars/new', error instanceof Error ? error.message : 'Unable to generate the calendar.')) }
  const { data: calendarId, error } = await supabase.rpc('create_calendar_with_days', {
    target_program_id: programId, target_school_year_id: schoolYearId, target_calendar_type_id: calendarTypeId,
    target_start_date: startDate, target_end_date: endDate, generated_days: generatedDays as unknown as Json,
  })
  if (error || !calendarId) redirect(errorPath('/calendars/new', error?.message ?? 'Unable to create calendar.'))
  redirect(`/calendars/${calendarId}`)
}

export type CalendarDaySaveInput = { dayId: string; calendarId: string; inSession: boolean; notes: string; activityIds: string[] }
export type CalendarDaySaveResult = { ok: true } | { ok: false; error: string }

export async function saveCalendarDayBackground(input: CalendarDaySaveInput): Promise<CalendarDaySaveResult> {
  await requireApprovedProgramUser()
  if (!input.dayId || !input.calendarId) return { ok: false, error: 'Missing calendar day information.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('save_calendar_day', {
    target_day_id: input.dayId, new_in_session: input.inSession, new_notes: input.notes.trim(), new_activity_type_ids: [...new Set(input.activityIds.filter(Boolean))],
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/calendars/${input.calendarId}`)
  return { ok: true }
}

export type BulkCalendarDaySaveInput = {
  calendarId: string
  days: Array<{ dayId: string; inSession: boolean; notes: string; activityIds: string[] }>
}

export async function saveCalendarDaysBulk(input: BulkCalendarDaySaveInput): Promise<CalendarDaySaveResult> {
  await requireApprovedProgramUser()
  if (!input.calendarId || input.days.length === 0) return { ok: false, error: 'Select at least one calendar day.' }
  if (input.days.length > 62) return { ok: false, error: 'Bulk edits are limited to 62 dates at a time.' }
  const supabase = await createClient()
  for (const day of input.days) {
    const { error } = await supabase.rpc('save_calendar_day', {
      target_day_id: day.dayId,
      new_in_session: day.inSession,
      new_notes: day.notes.trim(),
      new_activity_type_ids: [...new Set(day.activityIds.filter(Boolean))],
    })
    if (error) return { ok: false, error: `Unable to save all selected dates: ${error.message}` }
  }
  revalidatePath(`/calendars/${input.calendarId}`)
  return { ok: true }
}

export async function saveCalendarDay(formData: FormData) {
  const dayId = text(formData, 'day_id')
  const calendarId = text(formData, 'calendar_id')
  const result = await saveCalendarDayBackground({ dayId, calendarId, notes: text(formData, 'notes'), inSession: formData.get('in_session') === 'true', activityIds: formData.getAll('activity_type_ids').filter((value): value is string => typeof value === 'string' && value.length > 0) })
  if (!result.ok) redirect(errorPath(`/calendars/${calendarId}`, result.error))
  redirect(`/calendars/${calendarId}?saved=1`)
}

export async function submitCalendar(formData: FormData) {
  await requireApprovedProgramUser()
  const calendarId = text(formData, 'calendar_id')
  if (!calendarId) redirect('/calendars')
  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_calendar', { target_calendar_id: calendarId })
  if (error) redirect(errorPath(`/calendars/${calendarId}`, error.message))
  revalidatePath('/calendars')
  revalidatePath(`/calendars/${calendarId}`)
  redirect(`/calendars/${calendarId}?submitted=1`)
}
