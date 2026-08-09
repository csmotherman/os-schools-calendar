import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import type { CalendarStatus } from '@/types/database'

const statuses: CalendarStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED']

export default async function AdminCalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  let calendarsQuery = supabase
    .from('calendars')
    .select('id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, submitted_at, approved_at, updated_at')
    .order('updated_at', { ascending: false })

  if (status && statuses.includes(status as CalendarStatus)) {
    calendarsQuery = calendarsQuery.eq('status', status as CalendarStatus)
  }

  const [calendarsResult, programsResult, yearsResult, typesResult] = await Promise.all([
    calendarsQuery,
    supabase.from('programs').select('id, name'),
    supabase.from('school_years').select('id, name'),
    supabase.from('calendar_types').select('id, name'),
  ])

  const programMap = new Map((programsResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const calendars = calendarsResult.data ?? []

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">Oakland Schools Administration</p>
            <h1>Calendars</h1>
            <p className="muted">View calendars across every approved program.</p>
          </div>
          <Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link>
        </div>

        <form className="filter-row" method="get">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ''}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option value={item} key={item}>{item.replaceAll('_', ' ')}</option>)}
          </select>
          <button className="button button-small" type="submit">Filter</button>
          {status ? <Link href="/admin/calendars">Clear</Link> : null}
        </form>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Program</th><th>School year</th><th>Type</th><th>Dates</th><th>Status</th><th /></tr></thead>
            <tbody>
              {calendars.map((calendar) => (
                <tr key={calendar.id}>
                  <td><strong>{programMap.get(calendar.program_id) ?? 'Unknown program'}</strong></td>
                  <td>{yearMap.get(calendar.school_year_id) ?? '—'}</td>
                  <td>{typeMap.get(calendar.calendar_type_id) ?? '—'}</td>
                  <td>{calendar.start_date} – {calendar.end_date}</td>
                  <td><span className={`status-pill status-${calendar.status.toLowerCase()}`}>{calendar.status.replaceAll('_', ' ')}</span></td>
                  <td><Link href={`/admin/calendars/${calendar.id}`}>Open</Link></td>
                </tr>
              ))}
              {calendars.length === 0 ? <tr><td colSpan={6} className="muted">No calendars match this filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
