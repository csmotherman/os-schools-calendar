import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { HelpModal } from '@/components/help-modal'
import { AdminReportTable } from '@/components/admin-report-table'
import { getAccessState } from '@/lib/auth/access'
import { summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import type { CalendarStatus } from '@/types/database'

const statuses: CalendarStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED']

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ school_year_id?: string; status?: string }> }) {
  const filters = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  let query = supabase.from('calendars').select('id, program_id, school_year_id, calendar_type_id, status').order('program_id')
  if (filters.school_year_id) query = query.eq('school_year_id', filters.school_year_id)
  if (filters.status && statuses.includes(filters.status as CalendarStatus)) query = query.eq('status', filters.status as CalendarStatus)

  const [calendarsResult, programsResult, yearsResult, typesResult, activityTypesResult] = await Promise.all([
    query,
    supabase.from('programs').select('id, name'),
    supabase.from('school_years').select('id, name').order('start_date', { ascending: false }),
    supabase.from('calendar_types').select('id, name'),
    supabase.from('activity_types').select('id, name, display_order').order('display_order'),
  ])

  const calendars = calendarsResult.data ?? []
  const calendarIds = calendars.map((calendar) => calendar.id)
  const { data: days } = calendarIds.length ? await supabase.from('calendar_days').select('id, calendar_id, in_session').in('calendar_id', calendarIds) : { data: [] as { id: string; calendar_id: string; in_session: boolean }[] }
  const dayIds = (days ?? []).map((day) => day.id)
  const { data: dayActivities } = dayIds.length ? await supabase.from('calendar_day_activities').select('calendar_day_id, activity_type_id').in('calendar_day_id', dayIds) : { data: [] as { calendar_day_id: string; activity_type_id: string }[] }

  const activitiesByDay = new Map<string, string[]>()
  for (const item of dayActivities ?? []) activitiesByDay.set(item.calendar_day_id, [...(activitiesByDay.get(item.calendar_day_id) ?? []), item.activity_type_id])
  const daysByCalendar = new Map<string, { in_session: boolean; activity_type_ids: string[] }[]>()
  for (const day of days ?? []) daysByCalendar.set(day.calendar_id, [...(daysByCalendar.get(day.calendar_id) ?? []), { in_session: day.in_session, activity_type_ids: activitiesByDay.get(day.id) ?? [] }])

  const programMap = new Map((programsResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const activityTypes = activityTypesResult.data ?? []
  const rows = calendars.map((calendar) => {
    const summary = summarizeCalendarDays(daysByCalendar.get(calendar.id) ?? [])
    return { id: calendar.id, program: programMap.get(calendar.program_id) ?? 'Unknown program', year: yearMap.get(calendar.school_year_id) ?? '—', type: typeMap.get(calendar.calendar_type_id) ?? '—', status: calendar.status, sessionDays: summary.sessionDays, activities: summary.activityCounts }
  })

  const exportParams = new URLSearchParams()
  if (filters.school_year_id) exportParams.set('school_year_id', filters.school_year_id)
  if (filters.status) exportParams.set('status', filters.status)
  const exportHref = `/admin/reports/export${exportParams.size ? `?${exportParams.toString()}` : ''}`

  return <main className="page-shell"><section className="card card-wide stack settings-shell">
    <div className="page-toolbar"><BackButton fallback="/admin/dashboard" /><div className="actions-row"><HelpModal title="Admin reports" intro="Use filters for broad reporting and the program search box for fast lookup. Column headers with arrows can be clicked to sort the current results." steps={['Choose a school year or status if you want to narrow the report.', 'Search by any part of a program name without reloading the page.', 'Click Program, Year, Type, Status, or Session to sort ascending or descending.', 'Export CSV keeps the selected school-year and status filters.']} /><Link className="button" href={exportHref}>Export CSV</Link></div></div>
    <div className="settings-hero"><div><p className="side-eyebrow">Oakland Schools Administration</p><h1>Reports</h1><p className="muted">Search, sort, filter, and compare program calendar totals.</p></div></div>
    <form method="get" className="settings-filter-panel"><div className="field"><label htmlFor="school_year_id">School year</label><select id="school_year_id" name="school_year_id" defaultValue={filters.school_year_id ?? ''}><option value="">All school years</option>{(yearsResult.data ?? []).map((year) => <option value={year.id} key={year.id}>{year.name}</option>)}</select></div><div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={filters.status ?? ''}><option value="">All statuses</option>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select></div><div className="actions-row field-end"><button className="button button-small" type="submit">Apply filters</button><Link className="button button-secondary button-small" href="/admin/reports">Clear</Link></div></form>
    <AdminReportTable rows={rows} activities={activityTypes} />
  </section></main>
}
