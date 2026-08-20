import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDayGrid } from '@/components/calendar-day-grid'
import { ConfirmSubmitButton } from '@/components/confirm-submit-button'
import { getAccessState } from '@/lib/auth/access'
import { evaluateRequirements, hasBlockingFailures, summarizeCalendarDays } from '@/lib/calendar/summary'
import { createClient } from '@/lib/supabase/server'
import { approveCalendar, requestCalendarChanges } from '../../actions'

function displayDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`))
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

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
  const { data: calendar } = await supabase.from('calendars').select('id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, review_notes, submitted_at, approved_at').eq('id', calendarId).maybeSingle()
  if (!calendar) redirect('/admin/calendars')

  const [daysResult, activitiesResult, dayActivitiesResult, requirementsResult, typeResult, yearResult, programResult, structuralResult] = await Promise.all([
    supabase.from('calendar_days').select('id, date, in_session, notes').eq('calendar_id', calendarId).order('date'),
    supabase.from('activity_types').select('id, code, name, allowed_when_in_session, allowed_when_not_in_session').eq('active', true).order('display_order'),
    supabase.from('calendar_day_activities').select('calendar_day_id, activity_type_id'),
    supabase.from('requirements').select('id, metric_type, activity_type_id, minimum_count, maximum_count, severity').eq('school_year_id', calendar.school_year_id).eq('calendar_type_id', calendar.calendar_type_id).eq('active', true),
    supabase.from('calendar_types').select('name').eq('id', calendar.calendar_type_id).maybeSingle(),
    supabase.from('school_years').select('name').eq('id', calendar.school_year_id).maybeSingle(),
    supabase.from('programs').select('name').eq('id', calendar.program_id).maybeSingle(),
    supabase.rpc('calendar_has_structural_failures', { target_calendar_id: calendarId }),
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
  const structural = structuralResult.data === true
  const warningFailures = results.filter((item) => item.severity === 'WARNING' && !item.passes).length
  const approvalBlocked = blocking || structural
  const activityMap = new Map(activities.map((activity) => [activity.id, activity.name]))
  const programName = programResult.data?.name ?? 'Program'
  const calendarName = typeResult.data?.name ?? 'Calendar review'

  return (
    <main className="page-shell">
      <section className="content-shell stack">
        <div className="card card-fluid stack">
          <div className="header-row">
            <div><p className="muted">{programName} · {yearResult.data?.name}</p><h1>{calendarName}</h1><p className="muted">{displayDate(calendar.start_date)} – {displayDate(calendar.end_date)}</p></div>
            <div className="actions-row"><span className="status-pill">View only</span><span className={`status-pill status-${calendar.status.toLowerCase()}`}>{statusLabel(calendar.status)}</span><Link className="button button-secondary" href="/admin/calendars">Back to calendars</Link></div>
          </div>

          <div className="notice"><strong>Admin review mode:</strong> inspect every date, note, activity, and requirement without changing the program&apos;s submitted calendar.{calendar.submitted_at ? ` Submitted ${displayDate(calendar.submitted_at)}.` : ''}</div>
          {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
          {calendar.review_notes ? <div className="notice"><strong>Review notes:</strong> {calendar.review_notes}</div> : null}
          {structural ? <div className="alert alert-error" role="alert"><strong>Structural issue:</strong> this calendar has missing dates or a district blocked-date conflict. It cannot be approved until corrected.</div> : null}
          {warningFailures > 0 ? <div className="notice"><strong>{warningFailures} warning{warningFailures === 1 ? '' : 's'}:</strong> these do not block approval, but should be reviewed before approving.</div> : null}

          <div className="summary-grid"><div className="stat"><strong>Session days</strong><p className="metric">{summary.sessionDays}</p></div>{activities.map((activity) => <div className="stat" key={activity.id}><strong>{activity.name} days</strong><p className="metric">{summary.activityCounts[activity.id] ?? 0}</p></div>)}</div>

          <div className="section-heading section-spaced"><div><h2>Requirements</h2><p className="muted">Blocking requirements and structural conflicts prevent approval. Warnings remain reviewer-visible but do not block it.</p></div><span className={`status-pill ${approvalBlocked ? 'status-changes_requested' : 'status-approved'}`}>{approvalBlocked ? 'Blocking issues' : 'Ready for decision'}</span></div>
          <div className="requirements-list">
            {results.map((requirement) => {
              const label = requirement.metric_type === 'SESSION_DAYS' ? 'Session days' : `${activityMap.get(requirement.activity_type_id ?? '') ?? 'Activity'} days`
              return <div className="requirement-row" key={requirement.id}><div><strong>{label}</strong><p className="muted">Min {requirement.minimum_count ?? '—'} · Max {requirement.maximum_count ?? '—'} · {requirement.severity === 'BLOCK' ? 'Required' : 'Warning'}</p></div><strong className={requirement.passes ? 'success' : 'error'}>{requirement.actual_count} · {requirement.passes ? 'Pass' : 'Fail'}</strong></div>
            })}
            {results.length === 0 ? <div className="empty-state"><strong>No requirements configured</strong><p className="muted small-text">There are no requirement rules attached to this calendar type.</p></div> : null}
          </div>

          {calendar.status === 'PENDING' ? (
            <div className="review-actions">
              <div><h2>Administrative decision</h2><p className="muted small-text">Approval is recorded immediately. Requesting changes returns the calendar to the program with your notes.</p></div>
              <form action={approveCalendar}><input type="hidden" name="calendar_id" value={calendar.id} /><ConfirmSubmitButton className="button" disabled={approvalBlocked} message={`Approve the ${calendarName} for ${programName}?`}>Approve calendar</ConfirmSubmitButton></form>
              <form action={requestCalendarChanges} className="stack compact-stack"><input type="hidden" name="calendar_id" value={calendar.id} /><div className="field"><label htmlFor="notes">Required changes</label><textarea id="notes" name="notes" rows={3} required placeholder="Explain exactly what the program needs to correct before resubmitting." /></div><ConfirmSubmitButton className="button button-danger fit-button" message={`Return this calendar to ${programName} with the requested changes?`}>Request changes</ConfirmSubmitButton></form>
            </div>
          ) : null}
        </div>

        <div className="card card-fluid stack"><div><h2>Calendar preview</h2><p className="muted">Select any date to inspect session status, activities, and notes. The review view is read-only.</p></div><CalendarDayGrid calendarId={calendar.id} days={enrichedDays} activities={activities} editable={false} /></div>
      </section>
    </main>
  )
}
