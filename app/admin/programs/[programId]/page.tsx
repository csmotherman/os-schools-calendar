import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

export default async function AdminProgramPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: program }, membershipsResult, profilesResult, calendarsResult, typesResult, yearsResult] = await Promise.all([
    supabase.from('programs').select('id, name, active').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('id, user_id, status, created_at').eq('program_id', programId).order('created_at'),
    supabase.from('profiles').select('id, first_name, last_name, account_status'),
    supabase.from('calendars').select('id, calendar_type_id, school_year_id, status, updated_at').eq('program_id', programId).order('updated_at', { ascending: false }),
    supabase.from('calendar_types').select('id, name'),
    supabase.from('school_years').select('id, name'),
  ])
  if (!program) redirect('/admin/programs')

  const profileMap = new Map((profilesResult.data ?? []).map((item) => [item.id, item]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div><p className="muted">Program</p><h1>{program.name}</h1><p className="muted">{program.active ? 'Active' : 'Inactive'}</p></div>
          <Link className="button button-secondary" href="/admin/programs">All programs</Link>
        </div>

        <div className="section-heading"><h2>Users</h2><span className="badge">{membershipsResult.data?.length ?? 0}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Account</th><th>Membership</th></tr></thead>
            <tbody>
              {(membershipsResult.data ?? []).map((membership) => {
                const person = profileMap.get(membership.user_id)
                return <tr key={membership.id}><td>{person ? `${person.first_name} ${person.last_name}` : 'Unknown user'}</td><td>{person?.account_status ?? '—'}</td><td>{membership.status}</td></tr>
              })}
              {!membershipsResult.data?.length ? <tr><td colSpan={3} className="muted">No users are affiliated with this program.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="section-heading section-spaced"><h2>Calendars</h2><span className="badge">{calendarsResult.data?.length ?? 0}</span></div>
        <div className="calendar-list">
          {(calendarsResult.data ?? []).map((calendar) => (
            <Link className="calendar-list-item" href={`/admin/calendars/${calendar.id}`} key={calendar.id}>
              <div><strong>{typeMap.get(calendar.calendar_type_id) ?? 'Calendar'}</strong><p className="muted">{yearMap.get(calendar.school_year_id) ?? 'School year'}</p></div>
              <span className={`status-pill status-${calendar.status.toLowerCase()}`}>{calendar.status.replaceAll('_', ' ')}</span>
            </Link>
          ))}
          {!calendarsResult.data?.length ? <div className="empty-state">No calendars have been created for this program.</div> : null}
        </div>
      </section>
    </main>
  )
}
