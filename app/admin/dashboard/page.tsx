import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'

export default async function AdminDashboardPage() {
  const { user, profile } = await getAccessState()

  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  const [pendingProfiles, pendingMemberships, pendingCalendars, approvedCalendars, totalCalendars] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'PENDING'),
    supabase.from('program_memberships').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('calendars').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('calendars').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED'),
    supabase.from('calendars').select('id', { count: 'exact', head: true }),
  ])

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">Oakland Schools Administration</p>
            <h1>Admin dashboard</h1>
            <p className="muted">Signed in as {profile.first_name} {profile.last_name}</p>
          </div>
          <form action={logout}>
            <button className="button button-secondary" type="submit">Sign out</button>
          </form>
        </div>

        <div className="summary-grid">
          <Link className="stat stat-link" href="/admin/approvals">
            <strong>Pending access</strong>
            <p className="metric">{pendingMemberships.count ?? pendingProfiles.count ?? 0}</p>
          </Link>
          <Link className="stat stat-link" href="/admin/approvals">
            <strong>Pending calendars</strong>
            <p className="metric">{pendingCalendars.count ?? 0}</p>
          </Link>
          <Link className="stat stat-link" href="/admin/calendars?status=APPROVED">
            <strong>Approved calendars</strong>
            <p className="metric">{approvedCalendars.count ?? 0}</p>
          </Link>
          <Link className="stat stat-link" href="/admin/calendars">
            <strong>Total calendars</strong>
            <p className="metric">{totalCalendars.count ?? 0}</p>
          </Link>
        </div>

        <div className="admin-nav-grid">
          <Link className="nav-card" href="/admin/approvals"><strong>Approvals</strong><span>Review user requests and submitted calendars.</span></Link>
          <Link className="nav-card" href="/admin/users"><strong>Users</strong><span>Review accounts, roles, and program affiliations.</span></Link>
          <Link className="nav-card" href="/admin/programs"><strong>Programs</strong><span>Maintain the official program directory.</span></Link>
          <Link className="nav-card" href="/admin/calendars"><strong>Calendars</strong><span>Open calendars across all programs.</span></Link>
          <Link className="nav-card" href="/admin/reports"><strong>Reports</strong><span>Compare current calendar counts and statuses.</span></Link>
          <Link className="nav-card" href="/admin/settings"><strong>Settings</strong><span>School years, blocked dates, requirements, and reference data.</span></Link>
          <Link className="nav-card" href="/admin/audit-log"><strong>Audit log</strong><span>Review important database changes.</span></Link>
        </div>
      </section>
    </main>
  )
}
