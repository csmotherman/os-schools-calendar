import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'

export default async function DashboardPage() {
  const { user, profile, memberships, approvedMembership } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') redirect('/admin/dashboard')
  if (memberships.length === 0) redirect('/select-program')
  if (profile?.account_status !== 'APPROVED' || !approvedMembership) redirect('/pending')

  const supabase = await createClient()
  const [total, pending, approved, changesRequested] = await Promise.all([
    supabase.from('calendars').select('id', { count: 'exact', head: true }).eq('program_id', approvedMembership.program_id),
    supabase.from('calendars').select('id', { count: 'exact', head: true }).eq('program_id', approvedMembership.program_id).eq('status', 'PENDING'),
    supabase.from('calendars').select('id', { count: 'exact', head: true }).eq('program_id', approvedMembership.program_id).eq('status', 'APPROVED'),
    supabase.from('calendars').select('id', { count: 'exact', head: true }).eq('program_id', approvedMembership.program_id).eq('status', 'CHANGES_REQUESTED'),
  ])

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">Oakland Schools Program Calendar</p>
            <h1>{approvedMembership.programs?.name ?? 'Program dashboard'}</h1>
            <p className="muted">Welcome, {profile?.first_name}. Manage calendars and review their current status.</p>
          </div>
          <div className="actions-row">
            <Link className="button button-secondary" href="/profile">Profile</Link>
            <form action={logout}><button className="button button-secondary" type="submit">Sign out</button></form>
          </div>
        </div>

        <div className="summary-grid">
          <Link className="stat stat-link" href="/calendars"><strong>Total calendars</strong><p className="metric">{total.count ?? 0}</p></Link>
          <Link className="stat stat-link" href="/calendars"><strong>Pending review</strong><p className="metric">{pending.count ?? 0}</p></Link>
          <Link className="stat stat-link" href="/calendars"><strong>Approved</strong><p className="metric">{approved.count ?? 0}</p></Link>
          <Link className="stat stat-link" href="/calendars"><strong>Changes requested</strong><p className="metric">{changesRequested.count ?? 0}</p></Link>
        </div>

        <div className="admin-nav-grid">
          <Link className="nav-card" href="/calendars"><strong>Calendars</strong><span>Create, edit, and submit program calendars.</span></Link>
          <Link className="nav-card" href="/calendars/new"><strong>Create calendar</strong><span>Generate a new calendar from dates and normal weekdays.</span></Link>
          <Link className="nav-card" href="/summary"><strong>Summary</strong><span>Compare session and activity-day totals across calendars.</span></Link>
          <Link className="nav-card" href="/profile"><strong>Profile</strong><span>Review account information and update your name.</span></Link>
        </div>
      </section>
    </main>
  )
}
