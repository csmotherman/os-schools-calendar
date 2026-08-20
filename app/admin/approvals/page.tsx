import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ConfirmSubmitButton } from '@/components/confirm-submit-button'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { approveAccess, approveCalendar, declineAccess, requestCalendarChanges } from '../actions'

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const { user, profile } = await getAccessState()

  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  const [membershipsResult, profilesResult, programsResult, calendarsResult, typesResult, yearsResult] = await Promise.all([
    supabase.from('program_memberships').select('id, user_id, program_id, status, created_at').eq('status', 'PENDING').order('created_at'),
    supabase.from('profiles').select('id, first_name, last_name, account_status'),
    supabase.from('programs').select('id, name'),
    supabase.from('calendars').select('id, program_id, calendar_type_id, school_year_id, status, submitted_at, review_notes').eq('status', 'PENDING').order('submitted_at'),
    supabase.from('calendar_types').select('id, name'),
    supabase.from('school_years').select('id, name'),
  ])

  const loadErrors = [membershipsResult.error, profilesResult.error, programsResult.error, calendarsResult.error, typesResult.error, yearsResult.error].filter(Boolean)
  if (loadErrors.length > 0) console.error('Unable to load admin approval queue:', loadErrors)

  const profileMap = new Map((profilesResult.data ?? []).map((item) => [item.id, item]))
  const programMap = new Map((programsResult.data ?? []).map((item) => [item.id, item.name]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const memberships = membershipsResult.data ?? []
  const calendars = calendarsResult.data ?? []

  return (
    <main className="page-shell">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div><p className="dashboard-eyebrow">Oakland Schools · GSRP Administration</p><h1>Approval queue</h1><p className="dashboard-subtitle">Review access requests and submitted calendars that require an administrative decision.</p></div>
          <Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link>
        </header>

        {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
        {success ? <div className="alert alert-success" role="status">{success}</div> : null}
        {loadErrors.length > 0 ? <div className="alert alert-error" role="alert">The approval queue could not be fully loaded. Check the server log for the database error.</div> : null}

        {loadErrors.length === 0 ? <>
          <section className="dashboard-section" aria-labelledby="access-requests-heading">
            <div className="dashboard-section-header"><div><h2 id="access-requests-heading">User access requests</h2><p>Approving a request activates both the account and its selected program affiliation.</p></div><span className="badge">{memberships.length}</span></div>
            {memberships.length === 0 ? <div className="empty-state"><strong>No access requests waiting</strong><p className="muted small-text">New program access requests will appear here.</p></div> : (
              <div className="table-wrap"><table><thead><tr><th scope="col">User</th><th scope="col">Program</th><th scope="col">Account</th><th scope="col">Requested</th><th scope="col">Actions</th></tr></thead><tbody>
                {memberships.map((membership) => {
                  const requester = profileMap.get(membership.user_id)
                  const requesterName = requester ? `${requester.first_name} ${requester.last_name}` : 'Unknown user'
                  const programName = programMap.get(membership.program_id) ?? 'Unknown program'
                  return <tr key={membership.id}>
                    <td><strong>{requesterName}</strong></td>
                    <td>{programName}</td>
                    <td><span className="status-pill">{requester?.account_status ?? 'PENDING'}</span></td>
                    <td>{new Date(membership.created_at).toLocaleDateString()}</td>
                    <td><div className="actions-row">
                      <form action={approveAccess}><input type="hidden" name="membership_id" value={membership.id} /><ConfirmSubmitButton className="button button-small" message={`Approve access for ${requesterName} to ${programName}?`}>Approve</ConfirmSubmitButton></form>
                      <form action={declineAccess}><input type="hidden" name="membership_id" value={membership.id} /><ConfirmSubmitButton className="button button-danger button-small" message={`Decline the access request for ${requesterName}?`}>Decline</ConfirmSubmitButton></form>
                    </div></td>
                  </tr>
                })}
              </tbody></table></div>
            )}
          </section>

          <section className="dashboard-section" aria-labelledby="calendar-submissions-heading">
            <div className="dashboard-section-header"><div><h2 id="calendar-submissions-heading">Calendar submissions</h2><p>Open the calendar before approving it, or send it back with clear required changes.</p></div><span className="badge">{calendars.length}</span></div>
            {calendars.length === 0 ? <div className="empty-state"><strong>No calendars waiting for review</strong><p className="muted small-text">Submitted program calendars will appear here.</p></div> : (
              <div className="stack">{calendars.map((calendar) => {
                const programName = programMap.get(calendar.program_id) ?? 'Unknown program'
                const calendarName = typeMap.get(calendar.calendar_type_id) ?? 'Calendar'
                return <article className="review-card" key={calendar.id}>
                  <div className="header-row"><div><strong>{programName}</strong><p className="muted">{calendarName} · {yearMap.get(calendar.school_year_id) ?? 'School year'}</p></div><Link className="button button-secondary button-small" href={`/admin/calendars/${calendar.id}`}>Review calendar</Link></div>
                  <div className="review-decision-row"><form action={approveCalendar}><input type="hidden" name="calendar_id" value={calendar.id} /><ConfirmSubmitButton className="button button-small" message={`Approve the ${calendarName} for ${programName}?`}>Approve calendar</ConfirmSubmitButton></form><span className="muted small-text">Approval records your administrative decision immediately.</span></div>
                  <form action={requestCalendarChanges} className="stack compact-stack"><input type="hidden" name="calendar_id" value={calendar.id} /><div className="field"><label htmlFor={`notes-${calendar.id}`}>Changes required</label><textarea id={`notes-${calendar.id}`} name="notes" rows={3} required placeholder="Describe exactly what the program needs to correct before resubmitting." /></div><ConfirmSubmitButton className="button button-danger button-small fit-button" message={`Send this calendar back to ${programName} for changes?`}>Request changes</ConfirmSubmitButton></form>
                </article>
              })}</div>
            )}
          </section>
        </> : null}
      </div>
    </main>
  )
}
