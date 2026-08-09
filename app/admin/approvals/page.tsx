import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import {
  approveAccess,
  approveCalendar,
  declineAccess,
  requestCalendarChanges,
} from '../actions'

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const { user, profile } = await getAccessState()

  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const [membershipsResult, profilesResult, programsResult, calendarsResult, typesResult, yearsResult] =
    await Promise.all([
      supabase
        .from('program_memberships')
        .select('id, user_id, program_id, status, created_at')
        .eq('status', 'PENDING')
        .order('created_at'),
      supabase.from('profiles').select('id, first_name, last_name, account_status'),
      supabase.from('programs').select('id, name'),
      supabase
        .from('calendars')
        .select('id, program_id, calendar_type_id, school_year_id, status, submitted_at, review_notes')
        .eq('status', 'PENDING')
        .order('submitted_at'),
      supabase.from('calendar_types').select('id, name'),
      supabase.from('school_years').select('id, name'),
    ])

  const profileMap = new Map((profilesResult.data ?? []).map((item) => [item.id, item]))
  const programMap = new Map((programsResult.data ?? []).map((item) => [item.id, item.name]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))

  const memberships = membershipsResult.data ?? []
  const calendars = calendarsResult.data ?? []

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">Oakland Schools Administration</p>
            <h1>Approval queue</h1>
            <p className="muted">Review user access requests and submitted calendars.</p>
          </div>
          <Link className="button button-secondary" href="/admin/dashboard">
            Dashboard
          </Link>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <div className="section-heading">
          <div>
            <h2>User access requests</h2>
            <p className="muted">Both the account and selected program are approved together.</p>
          </div>
          <span className="badge">{memberships.length}</span>
        </div>

        {memberships.length === 0 ? (
          <div className="empty-state">No user access requests are waiting.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Program</th>
                  <th>Account</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => {
                  const requester = profileMap.get(membership.user_id)
                  return (
                    <tr key={membership.id}>
                      <td>{requester ? `${requester.first_name} ${requester.last_name}` : 'Unknown user'}</td>
                      <td>{programMap.get(membership.program_id) ?? 'Unknown program'}</td>
                      <td><span className="status-pill">{requester?.account_status ?? 'PENDING'}</span></td>
                      <td>{new Date(membership.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="actions-row">
                          <form action={approveAccess}>
                            <input type="hidden" name="membership_id" value={membership.id} />
                            <button className="button button-small" type="submit">Approve</button>
                          </form>
                          <form action={declineAccess}>
                            <input type="hidden" name="membership_id" value={membership.id} />
                            <button className="button button-danger button-small" type="submit">Decline</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="section-heading section-spaced">
          <div>
            <h2>Calendar submissions</h2>
            <p className="muted">Approve a pending calendar or send it back with required changes.</p>
          </div>
          <span className="badge">{calendars.length}</span>
        </div>

        {calendars.length === 0 ? (
          <div className="empty-state">No calendars are waiting for review.</div>
        ) : (
          <div className="stack">
            {calendars.map((calendar) => (
              <article className="review-card" key={calendar.id}>
                <div className="header-row">
                  <div>
                    <strong>{programMap.get(calendar.program_id) ?? 'Unknown program'}</strong>
                    <p className="muted">
                      {typeMap.get(calendar.calendar_type_id) ?? 'Calendar'} · {yearMap.get(calendar.school_year_id) ?? 'School year'}
                    </p>
                  </div>
                  <Link href={`/admin/calendars/${calendar.id}`}>Review calendar</Link>
                </div>

                <div className="actions-row">
                  <form action={approveCalendar}>
                    <input type="hidden" name="calendar_id" value={calendar.id} />
                    <button className="button button-small" type="submit">Approve calendar</button>
                  </form>
                </div>

                <form action={requestCalendarChanges} className="stack compact-stack">
                  <input type="hidden" name="calendar_id" value={calendar.id} />
                  <div className="field">
                    <label htmlFor={`notes-${calendar.id}`}>Changes required</label>
                    <textarea id={`notes-${calendar.id}`} name="notes" rows={3} required />
                  </div>
                  <button className="button button-danger button-small fit-button" type="submit">
                    Request changes
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
