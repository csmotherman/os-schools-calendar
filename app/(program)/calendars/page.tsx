import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

export default async function CalendarsPage() {
  const { user, profile, approvedMembership } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') {
    redirect('/admin/calendars')
  }
  if (profile?.account_status !== 'APPROVED' || !approvedMembership) redirect('/pending')

  const supabase = await createClient()
  const [calendarsResult, typesResult, yearsResult] = await Promise.all([
    supabase
      .from('calendars')
      .select('id, calendar_type_id, school_year_id, start_date, end_date, status, updated_at, review_notes')
      .eq('program_id', approvedMembership.program_id)
      .order('updated_at', { ascending: false }),
    supabase.from('calendar_types').select('id, name'),
    supabase.from('school_years').select('id, name'),
  ])

  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const calendars = calendarsResult.data ?? []

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">Program calendars</p>
            <h1>{approvedMembership.programs?.name ?? 'Calendars'}</h1>
            <p className="muted">Create, edit, validate, and submit calendars for review.</p>
          </div>
          <div className="actions-row">
            <Link className="button button-secondary" href="/dashboard">Dashboard</Link>
            <Link className="button" href="/calendars/new">Create calendar</Link>
          </div>
        </div>

        {calendars.length === 0 ? (
          <div className="empty-state">
            <h2>No calendars yet</h2>
            <p className="muted">Create the first calendar for this program and school year.</p>
            <Link className="button fit-button" href="/calendars/new">Create calendar</Link>
          </div>
        ) : (
          <div className="calendar-list">
            {calendars.map((calendar) => (
              <Link className="calendar-list-item" href={`/calendars/${calendar.id}`} key={calendar.id}>
                <div>
                  <strong>{typeMap.get(calendar.calendar_type_id) ?? 'Calendar'}</strong>
                  <p className="muted">{yearMap.get(calendar.school_year_id) ?? 'School year'} · {calendar.start_date} to {calendar.end_date}</p>
                  {calendar.review_notes ? <p className="error small-text">Review: {calendar.review_notes}</p> : null}
                </div>
                <span className={`status-pill status-${calendar.status.toLowerCase()}`}>{calendar.status.replaceAll('_', ' ')}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
