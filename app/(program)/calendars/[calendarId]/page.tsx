import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDayGrid } from '@/components/calendar-day-grid'
import { getAccessState } from '@/lib/auth/access'
import { evaluateRequirements, hasBlockingFailures, summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import { submitCalendar } from '../actions'

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ calendarId: string }>
  searchParams: Promise<{ error?: string; saved?: string; submitted?: string }>
}) {
  const { calendarId } = await params
  const messages = await searchParams
  const { user, profile, approvedMembership } = await getAccessState()

  if (!user) redirect('/login')
  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') {
    redirect(`/admin/calendars/${calendarId}`)
  }
  if (profile?.account_status !== 'APPROVED' || !approvedMembership) redirect('/pending')

  const supabase = await createClient()
  const { data: calendar } = await supabase
    .from('calendars')
    .select('id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, review_notes, submitted_at, approved_at')
    .eq('id', calendarId)
    .maybeSingle()

  if (!calendar) redirect('/calendars')

  const [daysResult, activitiesResult, dayActivitiesResult, requirementsResult, typeResult, yearResult, programResult] =
    await Promise.all([
      supabase
        .from('calendar_days')
        .select('id, date, in_session, notes')
        .eq('calendar_id', calendarId)
        .order('date'),
      supabase
        .from('activity_types')
        .select('id, code, name, allowed_when_in_session, allowed_when_not_in_session')
        .eq('active', true)
        .order('display_order'),
      supabase
        .from('calendar_day_activities')
        .select('calendar_day_id, activity_type_id'),
      supabase
        .from('requirements')
        .select('id, metric_type, activity_type_id, minimum_count, maximum_count, severity')
        .eq('school_year_id', calendar.school_year_id)
        .eq('calendar_type_id', calendar.calendar_type_id)
        .eq('active', true),
      supabase.from('calendar_types').select('name').eq('id', calendar.calendar_type_id).maybeSingle(),
      supabase.from('school_years').select('name').eq('id', calendar.school_year_id).maybeSingle(),
      supabase.from('programs').select('name').eq('id', calendar.program_id).maybeSingle(),
    ])

  const days = daysResult.data ?? []
  const dayIds = new Set(days.map((day) => day.id))
  const activitiesByDay = new Map<string, string[]>()
  for (const activity of dayActivitiesResult.data ?? []) {
    if (!dayIds.has(activity.calendar_day_id)) continue
    activitiesByDay.set(activity.calendar_day_id, [
      ...(activitiesByDay.get(activity.calendar_day_id) ?? []),
      activity.activity_type_id,
    ])
  }

  const enrichedDays = days.map((day) => ({
    ...day,
    activity_type_ids: activitiesByDay.get(day.id) ?? [],
  }))
  const activities = activitiesResult.data ?? []
  const requirements = requirementsResult.data ?? []
  const summary = summarizeCalendarDays(enrichedDays)
  const requirementResults = evaluateRequirements(enrichedDays, requirements)
  const blockingFailures = hasBlockingFailures(requirementResults)
  const activityNameMap = new Map(activities.map((activity) => [activity.id, activity.name]))
  const editable = calendar.status !== 'PENDING'

  return (
    <main className="page-shell">
      <section className="content-shell stack">
        <div className="card card-fluid stack">
          <div className="header-row">
            <div>
              <p className="muted">{programResult.data?.name ?? 'Program'} · {yearResult.data?.name ?? 'School year'}</p>
              <h1>{typeResult.data?.name ?? 'Calendar'}</h1>
              <p className="muted">{calendar.start_date} through {calendar.end_date}</p>
            </div>
            <div className="actions-row">
              <span className={`status-pill status-${calendar.status.toLowerCase()}`}>{calendar.status.replaceAll('_', ' ')}</span>
              <Link className="button button-secondary" href="/calendars">All calendars</Link>
            </div>
          </div>

          {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}
          {messages.saved ? <div className="alert alert-success">Calendar day saved.</div> : null}
          {messages.submitted ? <div className="alert alert-success">Calendar submitted for review.</div> : null}
          {calendar.review_notes ? <div className="alert alert-error"><strong>Reviewer notes:</strong> {calendar.review_notes}</div> : null}
          {calendar.status === 'PENDING' ? <div className="notice">This calendar is frozen while it is pending review. Editing becomes available again if changes are requested. After approval, any later edit automatically returns it to pending review.</div> : null}
          {calendar.status === 'APPROVED' ? <div className="notice">This calendar is approved. Any saved edit will automatically return it to Pending for re-review.</div> : null}

          <div className="summary-grid">
            <div className="stat"><strong>Session days</strong><p className="metric">{summary.sessionDays}</p></div>
            {activities.map((activity) => (
              <div className="stat" key={activity.id}>
                <strong>{activity.name} days</strong>
                <p className="metric">{summary.activityCounts[activity.id] ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="section-heading section-spaced">
            <div>
              <h2>Requirements</h2>
              <p className="muted">Counts are calculated from the current calendar, not stored separately.</p>
            </div>
            <span className={`status-pill ${blockingFailures ? 'status-changes_requested' : 'status-approved'}`}>
              {blockingFailures ? 'Blocking issues' : 'No blocking issues'}
            </span>
          </div>

          {requirementResults.length === 0 ? (
            <div className="empty-state">No requirements are configured for this school year and calendar type.</div>
          ) : (
            <div className="requirements-list">
              {requirementResults.map((requirement) => {
                const label = requirement.metric_type === 'SESSION_DAYS'
                  ? 'Session days'
                  : `${requirement.activity_type_id ? activityNameMap.get(requirement.activity_type_id) ?? 'Activity' : 'Activity'} days`
                const range = requirement.minimum_count !== null && requirement.maximum_count !== null
                  ? `${requirement.minimum_count}–${requirement.maximum_count}`
                  : requirement.minimum_count !== null
                    ? `At least ${requirement.minimum_count}`
                    : `No more than ${requirement.maximum_count}`

                return (
                  <div className="requirement-row" key={requirement.id}>
                    <div><strong>{label}</strong><p className="muted">Required: {range} · {requirement.severity}</p></div>
                    <div className={requirement.passes ? 'success' : 'error'}>{requirement.actual_count} · {requirement.passes ? 'Pass' : 'Needs attention'}</div>
                  </div>
                )
              })}
            </div>
          )}

          {(calendar.status === 'DRAFT' || calendar.status === 'CHANGES_REQUESTED') ? (
            <form action={submitCalendar}>
              <input type="hidden" name="calendar_id" value={calendar.id} />
              <button className="button" type="submit" disabled={blockingFailures}>
                {blockingFailures ? 'Resolve blocking requirements to submit' : 'Submit for review'}
              </button>
            </form>
          ) : null}
        </div>

        <div className="card card-fluid stack">
          <div>
            <h2>Calendar</h2>
            <p className="muted">Select a date to {editable ? 'edit session status, activities, and notes' : 'view its details'}.</p>
          </div>
          <CalendarDayGrid calendarId={calendar.id} days={enrichedDays} activities={activities} editable={editable} />
        </div>
      </section>
    </main>
  )
}
