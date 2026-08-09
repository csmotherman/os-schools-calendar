import { NextRequest } from 'next/server'
import { summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import type { CalendarStatus } from '@/types/database'

const statuses: CalendarStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED']

function csv(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Authentication required', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, account_status').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') {
    return new Response('Administrator access required', { status: 403 })
  }

  const schoolYearId = request.nextUrl.searchParams.get('school_year_id')
  const status = request.nextUrl.searchParams.get('status')
  let calendarQuery = supabase.from('calendars').select('id, program_id, school_year_id, calendar_type_id, status').order('program_id')
  if (schoolYearId) calendarQuery = calendarQuery.eq('school_year_id', schoolYearId)
  if (status && statuses.includes(status as CalendarStatus)) calendarQuery = calendarQuery.eq('status', status as CalendarStatus)

  const [calendarsResult, programsResult, yearsResult, typesResult, activityTypesResult] = await Promise.all([
    calendarQuery,
    supabase.from('programs').select('id, name'),
    supabase.from('school_years').select('id, name'),
    supabase.from('calendar_types').select('id, name'),
    supabase.from('activity_types').select('id, name').order('display_order'),
  ])

  const calendars = calendarsResult.data ?? []
  const calendarIds = calendars.map((calendar) => calendar.id)
  const { data: days } = calendarIds.length
    ? await supabase.from('calendar_days').select('id, calendar_id, in_session').in('calendar_id', calendarIds)
    : { data: [] as { id: string; calendar_id: string; in_session: boolean }[] }
  const dayIds = (days ?? []).map((day) => day.id)
  const { data: dayActivities } = dayIds.length
    ? await supabase.from('calendar_day_activities').select('calendar_day_id, activity_type_id').in('calendar_day_id', dayIds)
    : { data: [] as { calendar_day_id: string; activity_type_id: string }[] }

  const activityIdsByDay = new Map<string, string[]>()
  for (const item of dayActivities ?? []) activityIdsByDay.set(item.calendar_day_id, [...(activityIdsByDay.get(item.calendar_day_id) ?? []), item.activity_type_id])
  const daysByCalendar = new Map<string, { in_session: boolean; activity_type_ids: string[] }[]>()
  for (const day of days ?? []) daysByCalendar.set(day.calendar_id, [...(daysByCalendar.get(day.calendar_id) ?? []), { in_session: day.in_session, activity_type_ids: activityIdsByDay.get(day.id) ?? [] }])

  const programMap = new Map((programsResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const activityTypes = activityTypesResult.data ?? []
  const header = ['Program', 'School Year', 'Calendar Type', 'Status', 'Session Days', ...activityTypes.map((activity) => `${activity.name} Days`)]

  const lines = [header.map(csv).join(',')]
  for (const calendar of calendars) {
    const summary = summarizeCalendarDays(daysByCalendar.get(calendar.id) ?? [])
    lines.push([
      programMap.get(calendar.program_id) ?? 'Unknown program',
      yearMap.get(calendar.school_year_id) ?? 'Unknown school year',
      typeMap.get(calendar.calendar_type_id) ?? 'Unknown calendar type',
      calendar.status,
      summary.sessionDays,
      ...activityTypes.map((activity) => summary.activityCounts[activity.id] ?? 0),
    ].map(csv).join(','))
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="oakland-schools-calendar-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
