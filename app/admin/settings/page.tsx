import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'

export default async function AdminSettingsPage() {
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div><p className="muted">Oakland Schools Administration</p><h1>Settings</h1><p className="muted">Manage calendar reference data and compliance rules.</p></div>
          <Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link>
        </div>
        <div className="admin-nav-grid">
          <Link className="nav-card" href="/admin/settings/school-years"><strong>School years</strong><span>Create and activate school-year ranges.</span></Link>
          <Link className="nav-card" href="/admin/settings/blocked-dates"><strong>Blocked dates</strong><span>Maintain district-wide no-session and no-activity dates.</span></Link>
          <Link className="nav-card" href="/admin/settings/requirements"><strong>Requirements</strong><span>Configure minimum and maximum calendar counts.</span></Link>
          <Link className="nav-card" href="/admin/settings/calendar-types"><strong>Calendar types</strong><span>Maintain 4-Day/5-Day Part/Full Day options.</span></Link>
          <Link className="nav-card" href="/admin/settings/activity-types"><strong>Activity types</strong><span>Maintain Half Day, Conference, PL, Home Visit, and Break options.</span></Link>
        </div>
      </section>
    </main>
  )
}
