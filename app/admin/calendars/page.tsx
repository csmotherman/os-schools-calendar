import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import type { CalendarStatus } from '@/types/database'

const statuses: CalendarStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED']

function displayDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`))
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function AdminCalendarsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  let calendarsQuery = supabase.from('calendars').select('id, program_id, school_year_id, calendar_type_id, start_date, end_date, status, submitted_at, approved_at, updated_at').order('updated_at', { ascending: false })
  if (status && statuses.includes(status as CalendarStatus)) calendarsQuery = calendarsQuery.eq('status', status as CalendarStatus)

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
      <div className="dashboard-shell">
        <header className="dashboard-header"><div><p className="dashboard-eyebrow">Oakland Schools · GSRP Administration</p><h1>Calendars</h1><p className="dashboard-subtitle">Review calendar records across participating programs and open individual submissions for detailed review.</p></div><Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link></header>

        <section className="dashboard-section" aria-labelledby="admin-calendar-list-heading">
          <div className="dashboard-section-header"><div><h2 id="admin-calendar-list-heading">Calendar directory</h2><p>{calendars.length} calendar{calendars.length === 1 ? '' : 's'} match the current filter.</p></div></div>
          <form className="settings-filter-panel" method="get">
            <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status ?? ''}><option value="">All statuses</option>{statuses.map((item) => <option value={item} key={item}>{statusLabel(item)}</option>)}</select></div>
            <div className="actions-row field-end"><button className="button button-small" type="submit">Apply filter</button>{status ? <Link className="button button-secondary button-small" href="/admin/calendars">Clear</Link> : null}</div>
          </form>

          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Program</th><th scope="col">School year</th><th scope="col">Type</th><th scope="col">Dates</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {calendars.map((calendar) => <tr key={calendar.id}><td><strong>{programMap.get(calendar.program_id) ?? 'Unknown program'}</strong></td><td>{yearMap.get(calendar.school_year_id) ?? '—'}</td><td>{typeMap.get(calendar.calendar_type_id) ?? '—'}</td><td>{displayDate(calendar.start_date)} – {displayDate(calendar.end_date)}</td><td><span className={`status-pill status-${calendar.status.toLowerCase()}`}>{statusLabel(calendar.status)}</span></td><td><Link className="button button-secondary button-small" href={`/admin/calendars/${calendar.id}`}>Open</Link></td></tr>)}
                {calendars.length === 0 ? <tr><td colSpan={6}><div className="empty-table-state"><strong>No matching calendars</strong><span>Clear the status filter or choose a different status.</span></div></td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
