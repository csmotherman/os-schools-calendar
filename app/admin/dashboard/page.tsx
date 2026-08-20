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

  const loadErrors = [pendingProfiles.error, pendingMemberships.error, pendingCalendars.error, approvedCalendars.error, totalCalendars.error].filter(Boolean)
  if (loadErrors.length > 0) console.error('Unable to load one or more admin dashboard metrics:', loadErrors)

  const accessCount = pendingMemberships.count ?? pendingProfiles.count ?? 0
  const reviewCount = pendingCalendars.count ?? 0

  return (
    <main className="page-shell">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Oakland Schools · GSRP Administration</p>
            <h1>Administrative overview</h1>
            <p className="dashboard-subtitle">Review incoming work, manage program access, and monitor calendar completion across participating programs.</p>
          </div>
          <form action={logout}><button className="button button-secondary" type="submit">Sign out</button></form>
        </header>

        {loadErrors.length > 0 ? <div className="alert alert-error">Some dashboard data could not be loaded. Check the server log for the database error.</div> : null}

        <section className="dashboard-section" aria-labelledby="work-queue-heading">
          <div className="dashboard-section-header"><div><h2 id="work-queue-heading">Work queue</h2><p>Items currently requiring administrative attention.</p></div></div>
          <div className="metric-grid">
            <Link className="metric-card" href="/admin/approvals"><span className="metric-label">Access requests</span><span className="metric-value">{accessCount}</span><span className="metric-detail">Awaiting approval or decline</span></Link>
            <Link className="metric-card" href="/admin/approvals"><span className="metric-label">Calendars awaiting review</span><span className="metric-value">{reviewCount}</span><span className="metric-detail">Submitted by programs</span></Link>
            <Link className="metric-card" href="/admin/calendars?status=APPROVED"><span className="metric-label">Approved calendars</span><span className="metric-value">{approvedCalendars.count ?? 0}</span><span className="metric-detail">Current approved records</span></Link>
            <Link className="metric-card" href="/admin/calendars"><span className="metric-label">Total calendars</span><span className="metric-value">{totalCalendars.count ?? 0}</span><span className="metric-detail">Across all programs</span></Link>
          </div>
        </section>

        <div className="dashboard-grid-two">
          <section className="dashboard-section" aria-labelledby="admin-actions-heading">
            <div className="dashboard-section-header"><div><h2 id="admin-actions-heading">Priority actions</h2><p>Work that should be reviewed first.</p></div></div>
            <div className="action-list">
              {reviewCount > 0 ? <Link className="action-item" href="/admin/approvals"><div><strong>Review submitted calendars</strong><span>{reviewCount} calendar{reviewCount === 1 ? '' : 's'} are waiting for an administrative decision.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link> : null}
              {accessCount > 0 ? <Link className="action-item" href="/admin/approvals"><div><strong>Review access requests</strong><span>{accessCount} request{accessCount === 1 ? '' : 's'} need approval or decline.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link> : null}
              <Link className="action-item" href="/admin/reports"><div><strong>Review program reporting</strong><span>Compare submission and calendar status across participating programs.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link>
              <Link className="action-item" href="/admin/audit-log"><div><strong>Review system activity</strong><span>Inspect important changes recorded in the administrative audit log.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="management-heading">
            <div className="dashboard-section-header"><div><h2 id="management-heading">Management</h2><p>Administrative tools and configuration.</p></div></div>
            <div className="quick-links">
              <Link className="quick-link" href="/admin/users"><strong>Users</strong><span>Accounts, roles, and program affiliations.</span></Link>
              <Link className="quick-link" href="/admin/programs"><strong>Programs</strong><span>Maintain the official program directory.</span></Link>
              <Link className="quick-link" href="/admin/settings"><strong>Settings</strong><span>School years, requirements, blocked dates, and reference data.</span></Link>
              <Link className="quick-link" href="/admin/calendars"><strong>All calendars</strong><span>Open calendars across every program.</span></Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
