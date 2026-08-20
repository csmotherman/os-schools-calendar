import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDayGrid } from '@/components/calendar-day-grid'
import { ConfirmSubmitButton } from '@/components/confirm-submit-button'
import { getAccessState } from '@/lib/auth/access'
import { evaluateRequirements, hasBlockingFailures, summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import { submitCalendar, updateCalendarRange } from '../actions'

function displayDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`))
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ calendarId: string }>
  searchParams: Promise<{ error?: string; submitted?: string; rangeUpdated?: string }>
}) {
  const { calendarId } = await params
  const messages = await searchParams
  const { user, profile, approvedMembership } = await getAccessState()

  if (!user) redirect('/login')
  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') redirect(`/admin/calendars/${calendarId}`)
  if (profile?.account_status !== 'APPROVED' || !approvedMembership) redirect('/pending')

  const supabase = await createClient()
  const { data: calendar } = await supabase
    .from('calendars')
    .select('id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, review_notes, submitted_at, approved_at')
    .eq('id', calendarId)
    .maybeSingle()

  if (!calendar) redirect('/calendars')

  const [daysResult, activitiesResult, dayActivitiesResult, requirementsResult, typeResult, yearResult, programResult, structuralResult] = await Promise.all([
    supabase.from('calendar_days').select('id, date, in_session, notes').eq('calendar_id', calendarId).order('date'),
    supabase.from('activity_types').select('id, code, name, allowed_when_in_session, allowed_when_not_in_session').eq('active', true).order('display_order'),
    supabase.from('calendar_day_activities').select('calendar_day_id, activity_type_id'),
    supabase.from('requirements').select('id, metric_type, activity_type_id, minimum_count, maximum_count, severity').eq('school_year_id', calendar.school_year_id).eq('calendar_type_id', calendar.calendar_type_id).eq('active', true),
    supabase.from('calendar_types').select('name').eq('id', calendar.calendar_type_id).maybeSingle(),
    supabase.from('school_years').select('name, start_date, end_date').eq('id', calendar.school_year_id).maybeSingle(),
    supabase.from('programs').select('name').eq('id', calendar.program_id).maybeSingle(),
    supabase.rpc('calendar_has_structural_failures', { target_calendar_id: calendarId }),
  ])

  const days = daysResult.data ?? []
  const dayIds = new Set(days.map((day) => day.id))
  const activitiesByDay = new Map<string, string[]>()
  for (const activity of dayActivitiesResult.data ?? []) {
    if (dayIds.has(activity.calendar_day_id)) activitiesByDay.set(activity.calendar_day_id, [...(activitiesByDay.get(activity.calendar_day_id) ?? []), activity.activity_type_id])
  }

  const enrichedDays = days.map((day) => ({ ...day, activity_type_ids: activitiesByDay.get(day.id) ?? [] }))
  const activities = activitiesResult.data ?? []
  const requirements = requirementsResult.data ?? []
  const summary = summarizeCalendarDays(enrichedDays)
  const requirementResults = evaluateRequirements(enrichedDays, requirements)
  const blockingFailures = hasBlockingFailures(requirementResults)
  const structuralFailures = structuralResult.data === true
  const warningFailures = requirementResults.filter((item) => item.severity === 'WARNING' && !item.passes).length
  const activityNameMap = new Map(activities.map((activity) => [activity.id, activity.name]))
  const editable = calendar.status !== 'PENDING'
  const passingRequirements = requirementResults.filter((item) => item.passes).length
  const canSubmit = !blockingFailures && !structuralFailures

  return (
    <main className="calendar-page-shell">
      <div className="calendar-workspace">
        <header className="calendar-page-header">
          <div className="calendar-header-main">
            <nav className="calendar-breadcrumb" aria-label="Breadcrumb"><Link href="/calendars">Calendars</Link><span aria-hidden="true">/</span><span>{yearResult.data?.name ?? 'School year'}</span></nav>
            <div className="calendar-title-row">
              <div className="calendar-title-copy"><p className="calendar-program-name">{programResult.data?.name ?? 'Program'}</p><h1>{typeResult.data?.name ?? 'Program Calendar'}</h1><p className="calendar-date-range">{displayDate(calendar.start_date)} – {displayDate(calendar.end_date)}</p></div>
              <div className="calendar-header-actions"><span className={`status-pill status-${calendar.status.toLowerCase()}`}>{statusLabel(calendar.status)}</span><Link className="button button-secondary button-compact" href="/calendars">All calendars</Link></div>
            </div>
          </div>
          <div className="calendar-kpi-strip" aria-label="Calendar totals">
            <div><span>Session days</span><strong>{summary.sessionDays}</strong></div>
            {activities.slice(0, 3).map((activity) => <div key={activity.id}><span>{activity.name}</span><strong>{summary.activityCounts[activity.id] ?? 0}</strong></div>)}
            <div><span>Requirements</span><strong className={canSubmit ? 'kpi-success' : 'kpi-danger'}>{passingRequirements}/{requirementResults.length}</strong></div>
          </div>
        </header>

        <div className="calendar-message-stack" aria-live="polite">
          {messages.error ? <div className="alert alert-error" role="alert">{messages.error}</div> : null}
          {messages.submitted ? <div className="alert alert-success" role="status">Calendar submitted for review.</div> : null}
          {messages.rangeUpdated ? <div className="alert alert-success" role="status">Calendar dates updated successfully.</div> : null}
          {calendar.review_notes ? <div className="alert alert-error" role="alert"><strong>Reviewer notes:</strong> {calendar.review_notes}</div> : null}
          {structuralFailures ? <div className="alert alert-error" role="alert"><strong>Calendar integrity issue:</strong> one or more dates are missing or conflict with a district blocked date. Resolve this before submitting.</div> : null}
          {warningFailures > 0 ? <div className="notice"><strong>{warningFailures} warning{warningFailures === 1 ? '' : 's'}:</strong> submission is allowed, but Oakland Schools will see these requirement exceptions during review.</div> : null}
          {calendar.status === 'PENDING' ? <div className="notice"><strong>Awaiting Oakland Schools review.</strong> This calendar is locked until a reviewer approves it or requests changes.{calendar.submitted_at ? ` Submitted ${displayDate(calendar.submitted_at)}.` : ''}</div> : null}
          {calendar.status === 'APPROVED' ? <div className="notice approved-edit-notice"><strong>Approved calendar.</strong> Editing any date or changing the calendar range will automatically reopen this calendar for Oakland Schools review.{calendar.approved_at ? ` Approved ${displayDate(calendar.approved_at)}.` : ''}</div> : null}
        </div>

        <div className="calendar-layout">
          <section className="calendar-primary" aria-label="Calendar editor"><CalendarDayGrid calendarId={calendar.id} days={enrichedDays} activities={activities} editable={editable} /></section>
          <aside className="calendar-inspector" aria-label="Calendar details and workflow">
            <section className="inspector-card calendar-settings-card">
              <div className="inspector-heading"><div><p className="side-eyebrow">Calendar settings</p><h2>Date range</h2></div></div>
              <p className="muted settings-help">Change when this calendar begins or ends. Existing dates inside the new range keep their edits.</p>
              <form action={updateCalendarRange} className="calendar-range-form">
                <input type="hidden" name="calendar_id" value={calendar.id} />
                <label><span>Start date</span><input type="date" name="start_date" defaultValue={calendar.start_date} min={yearResult.data?.start_date} max={yearResult.data?.end_date} disabled={!editable} /></label>
                <label><span>End date</span><input type="date" name="end_date" defaultValue={calendar.end_date} min={yearResult.data?.start_date} max={yearResult.data?.end_date} disabled={!editable} /></label>
                {calendar.status === 'APPROVED' ? <ConfirmSubmitButton className="button button-compact" message="Changing the date range will reopen this approved calendar for Oakland Schools review. Continue?">Update dates</ConfirmSubmitButton> : <button className="button button-compact" type="submit" disabled={!editable}>Update dates</button>}
              </form>
              <p className="range-boundary-note">School year: {displayDate(yearResult.data?.start_date ?? null)} – {displayDate(yearResult.data?.end_date ?? null)}</p>
            </section>

            <section className="inspector-card">
              <div className="inspector-heading"><div><p className="side-eyebrow">Validation</p><h2>Requirements</h2></div><span className={`status-pill ${canSubmit ? 'status-approved' : 'status-changes_requested'}`}>{canSubmit ? 'Ready' : 'Needs attention'}</span></div>
              {requirementResults.length === 0 ? <p className="muted small-text">No requirements are configured for this calendar type.</p> : <div className="requirements-compact">{requirementResults.map((requirement) => {
                const label = requirement.metric_type === 'SESSION_DAYS' ? 'Session days' : `${requirement.activity_type_id ? activityNameMap.get(requirement.activity_type_id) ?? 'Activity' : 'Activity'} days`
                const range = requirement.minimum_count !== null && requirement.maximum_count !== null ? `${requirement.minimum_count}–${requirement.maximum_count}` : requirement.minimum_count !== null ? `≥ ${requirement.minimum_count}` : `≤ ${requirement.maximum_count}`
                return <div className="requirement-compact-row" key={requirement.id}><div><strong>{label}</strong><span>Target {range} · {requirement.severity === 'BLOCK' ? 'Required' : 'Warning'}</span></div><span className={requirement.passes ? 'requirement-pass' : 'requirement-fail'} aria-label={`Current count ${requirement.actual_count}, ${requirement.passes ? 'passes' : 'does not pass'}`}>{requirement.actual_count}</span></div>
              })}</div>}
            </section>

            <section className="inspector-card"><div className="inspector-heading"><div><p className="side-eyebrow">Year totals</p><h2>Activity days</h2></div></div><dl className="activity-total-list">{activities.map((activity) => <div key={activity.id}><dt>{activity.name}</dt><dd>{summary.activityCounts[activity.id] ?? 0}</dd></div>)}</dl></section>

            {(calendar.status === 'DRAFT' || calendar.status === 'CHANGES_REQUESTED') ? <section className="inspector-card submit-card"><div><p className="side-eyebrow">Workflow</p><h2>Submit for review</h2></div><p className="muted small-text">Submission locks program editing while Oakland Schools reviews the calendar.</p><form action={submitCalendar}><input type="hidden" name="calendar_id" value={calendar.id} /><ConfirmSubmitButton className="button calendar-submit-button" disabled={!canSubmit} message="Submit this calendar to Oakland Schools for review? You will not be able to edit it while review is pending.">{structuralFailures ? 'Resolve calendar conflicts first' : blockingFailures ? 'Resolve requirements first' : 'Submit for review'}</ConfirmSubmitButton></form></section> : null}
          </aside>
        </div>
      </div>
    </main>
  )
}
