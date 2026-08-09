import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import type { CalendarStatus } from '@/types/database'

const statuses: CalendarStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED']

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ school_year_id?: string; status?: string }>
}) {
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
  const { data: days } = calendarIds.length
    ? await supabase.from('calendar_days').select('id, calendar_id, in_session').in('calendar_id', calendarIds)
    : { data: [] as { id: string; calendar_id: string; in_session: boolean }[] }
  const dayIds = (days ?? []).map((day) => day.id)
  const { data: dayActivities } = dayIds.length
    ? await supabase.from('calendar_day_activities').select('calendar_day_id, activity_type_id').in('calendar_day_id', dayIds)
    : { data: [] as { calendar_day_id: string; activity_type_id: string }[] }

  const activitiesByDay = new Map<string, string[]>()
  for (const item of dayActivities ?? []) {
    activitiesByDay.set(item.calendar_day_id, [...(activitiesByDay.get(item.calendar_day_id) ?? []), item.activity_type_id])
  }
  const daysByCalendar = new Map<string, { in_session: boolean; activity_type_ids: string[] }[]>()
  for (const day of days ?? []) {
    daysByCalendar.set(day.calendar_id, [...(daysByCalendar.get(day.calendar_id) ?? []), { in_session: day.in_session, activity_type_ids: activitiesByDay.get(day.id) ?? [] }])
  }

  const programMap = new Map((programsResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const activityTypes = activityTypesResult.data ?? []

  const exportParams = new URLSearchParams()
  if (filters.school_year_id) exportParams.set('school_year_id', filters.school_year_id)
  if (filters.status) exportParams.set('status', filters.status)
  const exportHref = `/admin/reports/export${exportParams.size ? `?${exportParams.toString()}` : ''}`

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div><p className="muted">Oakland Schools Administration</p><h1>Reports</h1><p className="muted">Current counts are derived from calendar-day records.</p></div>
          <div className="actions-row"><Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link><Link className="button" href={exportHref}>Export CSV</Link></div>
        </div>

        <form method="get" className="filter-row">
          <label htmlFor="school_year_id">School year</label>
          <select id="school_year_id" name="school_year_id" defaultValue={filters.school_year_id ?? ''}><option value="">All</option>{(yearsResult.data ?? []).map((year) => <option value={year.id} key={year.id}>{year.name}</option>)}</select>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ''}><option value="">All</option>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select>
          <button className="button button-small" type="submit">Apply</button>
          <Link href="/admin/reports">Clear</Link>
        </form>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Program</th><th>Year</th><th>Type</th><th>Status</th><th>Session</th>{activityTypes.map((activity) => <th key={activity.id}>{activity.name}</th>)}</tr></thead>
            <tbody>
              {calendars.map((calendar) => {
                const summary = summarizeCalendarDays(daysByCalendar.get(calendar.id) ?? [])
                return <tr key={calendar.id}><td><Link href={`/admin/calendars/${calendar.id}`}>{programMap.get(calendar.program_id) ?? 'Unknown'}</Link></td><td>{yearMap.get(calendar.school_year_id) ?? '—'}</td><td>{typeMap.get(calendar.calendar_type_id) ?? '—'}</td><td>{calendar.status.replaceAll('_', ' ')}</td><td>{summary.sessionDays}</td>{activityTypes.map((activity) => <td key={activity.id}>{summary.activityCounts[activity.id] ?? 0}</td>)}</tr>
              })}
              {calendars.length === 0 ? <tr><td colSpan={5 + activityTypes.length} className="muted">No calendars match the selected filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
