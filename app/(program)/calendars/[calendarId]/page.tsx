import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDayGrid } from '@/components/calendar-day-grid'
import { getAccessState } from '@/lib/auth/access'
import { evaluateRequirements, hasBlockingFailures, summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import { submitCalendar } from '../actions'

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ calendarId: string }>; searchParams: Promise<{ error?: string; submitted?: string }> }) {
  const { calendarId } = await params
  const messages = await searchParams
  const { user, profile, approvedMembership } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') redirect(`/admin/calendars/${calendarId}`)
  if (profile?.account_status !== 'APPROVED' || !approvedMembership) redirect('/pending')

  const supabase = await createClient()
  const { data: calendar } = await supabase.from('calendars').select('id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, review_notes, submitted_at, approved_at').eq('id', calendarId).maybeSingle()
  if (!calendar) redirect('/calendars')

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
  for (const activity of dayActivitiesResult.data ?? []) if (dayIds.has(activity.calendar_day_id)) activitiesByDay.set(activity.calendar_day_id, [...(activitiesByDay.get(activity.calendar_day_id) ?? []), activity.activity_type_id])
  const enrichedDays = days.map((day) => ({ ...day, activity_type_ids: activitiesByDay.get(day.id) ?? [] }))
  const activities = activitiesResult.data ?? []
  const requirements = requirementsResult.data ?? []
  const summary = summarizeCalendarDays(enrichedDays)
  const requirementResults = evaluateRequirements(enrichedDays, requirements)
  const blockingFailures = hasBlockingFailures(requirementResults)
  const activityNameMap = new Map(activities.map((activity) => [activity.id, activity.name]))
  const editable = calendar.status !== 'PENDING'
  const passingRequirements = requirementResults.filter((item) => item.passes).length

  return (
    <main className="page-shell calendar-page-shell">
      <section className="content-shell calendar-workspace">
        <header className="calendar-hero">
          <div className="calendar-breadcrumb"><Link href="/calendars">Calendars</Link><span>/</span><span>{yearResult.data?.name ?? 'School year'}</span></div>
          <div className="calendar-hero-row">
            <div><p className="calendar-program-name">{programResult.data?.name ?? 'Program'}</p><h1>{typeResult.data?.name ?? 'Program Calendar'}</h1><p className="muted">{calendar.start_date} – {calendar.end_date}</p></div>
            <div className="actions-row"><span className={`status-pill status-${calendar.status.toLowerCase()}`}>{calendar.status.replaceAll('_', ' ')}</span><Link className="button button-secondary" href="/calendars">All calendars</Link></div>
          </div>
        </header>

        {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}
        {messages.submitted ? <div className="alert alert-success">Calendar submitted for review.</div> : null}
        {calendar.review_notes ? <div className="alert alert-error"><strong>Reviewer notes:</strong> {calendar.review_notes}</div> : null}
        {calendar.status === 'PENDING' ? <div className="notice">This calendar is locked while Oakland Schools reviews it.</div> : null}
        {calendar.status === 'APPROVED' ? <div className="notice">This calendar is approved. Saving a later change will return it to review automatically.</div> : null}

        <div className="calendar-dashboard-grid">
          <section className="calendar-main-column">
            <div className="calendar-panel calendar-panel-header"><div><h2>Calendar</h2><p className="muted">Select a date to {editable ? 'make changes. Updates save automatically.' : 'view its details.'}</p></div></div>
            <CalendarDayGrid calendarId={calendar.id} days={enrichedDays} activities={activities} editable={editable} />
          </section>

          <aside className="calendar-sidebar">
            <section className="calendar-side-card">
              <div className="section-heading"><div><p className="side-eyebrow">At a glance</p><h2>Calendar totals</h2></div></div>
              <div className="calendar-total-primary"><strong>{summary.sessionDays}</strong><span>Session days</span></div>
              <div className="calendar-total-list">{activities.map((activity) => <div key={activity.id}><span>{activity.name}</span><strong>{summary.activityCounts[activity.id] ?? 0}</strong></div>)}</div>
            </section>

            <section className="calendar-side-card">
              <div className="section-heading"><div><p className="side-eyebrow">Validation</p><h2>Requirements</h2></div><span className={`status-pill ${blockingFailures ? 'status-changes_requested' : 'status-approved'}`}>{passingRequirements}/{requirementResults.length}</span></div>
              {requirementResults.length === 0 ? <p className="muted small-text">No requirements configured.</p> : <div className="requirements-compact">{requirementResults.map((requirement) => {
                const label = requirement.metric_type === 'SESSION_DAYS' ? 'Session days' : `${requirement.activity_type_id ? activityNameMap.get(requirement.activity_type_id) ?? 'Activity' : 'Activity'} days`
                const range = requirement.minimum_count !== null && requirement.maximum_count !== null ? `${requirement.minimum_count}–${requirement.maximum_count}` : requirement.minimum_count !== null ? `≥ ${requirement.minimum_count}` : `≤ ${requirement.maximum_count}`
                return <div className="requirement-compact-row" key={requirement.id}><div><strong>{label}</strong><span>Target {range}</span></div><span className={requirement.passes ? 'requirement-pass' : 'requirement-fail'}>{requirement.actual_count}</span></div>
              })}</div>}
            </section>

            {(calendar.status === 'DRAFT' || calendar.status === 'CHANGES_REQUESTED') ? <section className="calendar-side-card submit-card"><h2>Ready for review?</h2><p className="muted small-text">Oakland Schools will review this calendar after submission.</p><form action={submitCalendar}><input type="hidden" name="calendar_id" value={calendar.id} /><button className="button calendar-submit-button" type="submit" disabled={blockingFailures}>{blockingFailures ? 'Resolve requirements first' : 'Submit for review'}</button></form></section> : null}
          </aside>
        </div>
      </section>
    </main>
  )
}
