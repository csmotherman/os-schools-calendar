import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDayGrid } from '@/components/calendar-day-grid'
import { getAccessState } from '@/lib/auth/access'
import { evaluateRequirements, hasBlockingFailures, summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import { approveCalendar, requestCalendarChanges } from '../../actions'

export default async function AdminCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ calendarId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { calendarId } = await params
  const { error } = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  const { data: calendar } = await supabase
    .from('calendars')
    .select('id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, review_notes, submitted_at, approved_at')
    .eq('id', calendarId)
    .maybeSingle()
  if (!calendar) redirect('/admin/calendars')

  const [daysResult, activitiesResult, dayActivitiesResult, requirementsResult, typeResult, yearResult, programResult] = await Promise.all([
    supabase.from('calendar_days').select('id, date, in_session, notes').eq('calendar_id', calendarId).order('date'),
    supabase.from('activity_types').select('id, code, name, allowed_when_in_session, allowed_when_not_in_session').eq('active', true).order('display_order'),
    supabase.from('calendar_day_activities').select('calendar_day_id, activity_type_id'),
    supabase.from('requirements').select('id, metric_type, activity_type_id, minimum_count, maximum_count, severity').eq('school_year_id', calendar.school_year_id).eq('calendar_type_id', calendar.calendar_type_id).eq('active', true),
    supabase.from('calendar_types').select('name').eq('id', calendar.calendar_type_id).maybeSingle(),
    supabase.from('school_years').select('name').eq('id', calendar.school_year_id).maybeSingle(),
    supabase.from('programs').select('name').eq('id', calendar.program_id).maybeSingle(),
  ])

  const days = daysResult.data ?? []
  const dayIds = new Set(days.map((day) => day.id))
  const activitiesByDay = new Map<string, string[]>()
  for (const item of dayActivitiesResult.data ?? []) {
    if (!dayIds.has(item.calendar_day_id)) continue
    activitiesByDay.set(item.calendar_day_id, [...(activitiesByDay.get(item.calendar_day_id) ?? []), item.activity_type_id])
  }
  const enrichedDays = days.map((day) => ({ ...day, activity_type_ids: activitiesByDay.get(day.id) ?? [] }))
  const activities = activitiesResult.data ?? []
  const requirements = requirementsResult.data ?? []
  const summary = summarizeCalendarDays(enrichedDays)
  const results = evaluateRequirements(enrichedDays, requirements)
  const blocking = hasBlockingFailures(results)
  const activityMap = new Map(activities.map((activity) => [activity.id, activity.name]))

  return (
    <main className="page-shell">
      <section className="content-shell stack">
        <div className="card card-fluid stack">
          <div className="header-row">
            <div>
              <p className="muted">{programResult.data?.name} · {yearResult.data?.name}</p>
              <h1>{typeResult.data?.name ?? 'Calendar review'}</h1>
              <p className="muted">{calendar.start_date} through {calendar.end_date}</p>
            </div>
            <div className="actions-row">
              <span className={`status-pill status-${calendar.status.toLowerCase()}`}>{calendar.status.replaceAll('_', ' ')}</span>
              <Link className="button button-secondary" href="/admin/calendars">All calendars</Link>
            </div>
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}
          {calendar.review_notes ? <div className="notice"><strong>Review notes:</strong> {calendar.review_notes}</div> : null}

          <div className="summary-grid">
            <div className="stat"><strong>Session days</strong><p className="metric">{summary.sessionDays}</p></div>
            {activities.map((activity) => <div className="stat" key={activity.id}><strong>{activity.name} days</strong><p className="metric">{summary.activityCounts[activity.id] ?? 0}</p></div>)}
          </div>

          <div className="section-heading section-spaced">
            <div><h2>Requirements</h2><p className="muted">Database workflow blocks approval when a blocking requirement fails.</p></div>
            <span className={`status-pill ${blocking ? 'status-changes_requested' : 'status-approved'}`}>{blocking ? 'Blocking issues' : 'Ready'}</span>
          </div>
          <div className="requirements-list">
            {results.map((requirement) => {
              const label = requirement.metric_type === 'SESSION_DAYS' ? 'Session days' : `${activityMap.get(requirement.activity_type_id ?? '') ?? 'Activity'} days`
              return <div className="requirement-row" key={requirement.id}><div><strong>{label}</strong><p className="muted">Min {requirement.minimum_count ?? '—'} · Max {requirement.maximum_count ?? '—'} · {requirement.severity}</p></div><strong className={requirement.passes ? 'success' : 'error'}>{requirement.actual_count} · {requirement.passes ? 'Pass' : 'Fail'}</strong></div>
            })}
            {results.length === 0 ? <div className="empty-state">No requirements configured.</div> : null}
          </div>

          {calendar.status === 'PENDING' ? (
            <div className="review-actions">
              <form action={approveCalendar}>
                <input type="hidden" name="calendar_id" value={calendar.id} />
                <button className="button" type="submit" disabled={blocking}>Approve calendar</button>
              </form>
              <form action={requestCalendarChanges} className="stack compact-stack">
                <input type="hidden" name="calendar_id" value={calendar.id} />
                <div className="field"><label htmlFor="notes">Required changes</label><textarea id="notes" name="notes" rows={3} required /></div>
                <button className="button button-danger fit-button" type="submit">Request changes</button>
              </form>
            </div>
          ) : null}
        </div>

        <div className="card card-fluid stack">
          <div><h2>Calendar days</h2><p className="muted">Admins may inspect or correct any calendar day. Edits to an approved calendar automatically reopen review.</p></div>
          <CalendarDayGrid calendarId={calendar.id} days={enrichedDays} activities={activities} editable />
        </div>
      </section>
    </main>
  )
}
