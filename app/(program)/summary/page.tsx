import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'

export default async function ProgramSummaryPage() {
  const { user, profile, approvedMembership } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') redirect('/admin/reports')
  if (profile?.account_status !== 'APPROVED' || !approvedMembership) redirect('/pending')

  const supabase = await createClient()
  const [calendarsResult, typesResult, yearsResult, activityTypesResult] = await Promise.all([
    supabase.from('calendars').select('id, calendar_type_id, school_year_id, status').eq('program_id', approvedMembership.program_id).order('updated_at', { ascending: false }),
    supabase.from('calendar_types').select('id, name'),
    supabase.from('school_years').select('id, name'),
    supabase.from('activity_types').select('id, name').eq('active', true).order('display_order'),
  ])
  const calendars = calendarsResult.data ?? []
  const ids = calendars.map((calendar) => calendar.id)
  const { data: days } = ids.length ? await supabase.from('calendar_days').select('id, calendar_id, in_session').in('calendar_id', ids) : { data: [] as { id: string; calendar_id: string; in_session: boolean }[] }
  const dayIds = (days ?? []).map((day) => day.id)
  const { data: dayActivities } = dayIds.length ? await supabase.from('calendar_day_activities').select('calendar_day_id, activity_type_id').in('calendar_day_id', dayIds) : { data: [] as { calendar_day_id: string; activity_type_id: string }[] }
  const activitiesByDay = new Map<string, string[]>()
  for (const item of dayActivities ?? []) activitiesByDay.set(item.calendar_day_id, [...(activitiesByDay.get(item.calendar_day_id) ?? []), item.activity_type_id])
  const daysByCalendar = new Map<string, { in_session: boolean; activity_type_ids: string[] }[]>()
  for (const day of days ?? []) daysByCalendar.set(day.calendar_id, [...(daysByCalendar.get(day.calendar_id) ?? []), { in_session: day.in_session, activity_type_ids: activitiesByDay.get(day.id) ?? [] }])
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const activityTypes = activityTypesResult.data ?? []

  return <main className="page-shell"><section className="card card-wide stack">
    <div className="header-row"><div><p className="muted">{approvedMembership.programs?.name}</p><h1>Calendar summary</h1></div><div className="actions-row"><Link className="button button-secondary" href="/dashboard">Dashboard</Link><Link className="button" href="/calendars">Calendars</Link></div></div>
    <div className="table-wrap"><table><thead><tr><th>Year</th><th>Type</th><th>Status</th><th>Session</th>{activityTypes.map((activity) => <th key={activity.id}>{activity.name}</th>)}</tr></thead><tbody>{calendars.map((calendar) => { const summary = summarizeCalendarDays(daysByCalendar.get(calendar.id) ?? []); return <tr key={calendar.id}><td>{yearMap.get(calendar.school_year_id) ?? '—'}</td><td><Link href={`/calendars/${calendar.id}`}>{typeMap.get(calendar.calendar_type_id) ?? 'Calendar'}</Link></td><td>{calendar.status.replaceAll('_', ' ')}</td><td>{summary.sessionDays}</td>{activityTypes.map((activity) => <td key={activity.id}>{summary.activityCounts[activity.id] ?? 0}</td>)}</tr> })}{calendars.length === 0 ? <tr><td colSpan={4 + activityTypes.length} className="muted">No calendars yet.</td></tr> : null}</tbody></table></div>
  </section></main>
}
