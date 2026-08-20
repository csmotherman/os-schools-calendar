import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

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
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Oakland Schools · GSRP Calendar</p>
            <h1>{approvedMembership.programs?.name ?? 'Program dashboard'}</h1>
            <p className="dashboard-subtitle">Welcome, {profile?.first_name}. Review calendar status, respond to requested changes, and keep your program submission on track.</p>
          </div>
        </header>

        <section className="dashboard-section" aria-labelledby="calendar-overview-heading">
          <div className="dashboard-section-header">
            <div>
              <h2 id="calendar-overview-heading">Calendar overview</h2>
              <p>Current status across your program calendars.</p>
            </div>
            <Link className="button button-small" href="/calendars/new">Create calendar</Link>
          </div>
          <div className="metric-grid">
            <Link className="metric-card" href="/calendars"><span className="metric-label">Total calendars</span><span className="metric-value">{total.count ?? 0}</span><span className="metric-detail">All school years and types</span></Link>
            <Link className="metric-card" href="/calendars"><span className="metric-label">Awaiting review</span><span className="metric-value">{pending.count ?? 0}</span><span className="metric-detail">Submitted to Oakland Schools</span></Link>
            <Link className="metric-card" href="/calendars"><span className="metric-label">Approved</span><span className="metric-value">{approved.count ?? 0}</span><span className="metric-detail">No current action required</span></Link>
            <Link className="metric-card" href="/calendars"><span className="metric-label">Changes requested</span><span className="metric-value">{changesRequested.count ?? 0}</span><span className="metric-detail">Program action required</span></Link>
          </div>
        </section>

        <div className="dashboard-grid-two">
          <section className="dashboard-section" aria-labelledby="next-actions-heading">
            <div className="dashboard-section-header"><div><h2 id="next-actions-heading">Next actions</h2><p>Start with the items that move your calendar forward.</p></div></div>
            <div className="action-list">
              {changesRequested.count ? <Link className="action-item" href="/calendars"><div><strong>Respond to requested changes</strong><span>{changesRequested.count} calendar{changesRequested.count === 1 ? '' : 's'} need updates before approval.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link> : null}
              {pending.count ? <Link className="action-item" href="/calendars"><div><strong>Track submitted calendars</strong><span>{pending.count} calendar{pending.count === 1 ? '' : 's'} are currently awaiting review.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link> : null}
              <Link className="action-item" href="/calendars"><div><strong>Review program calendars</strong><span>Open calendars, confirm day counts, and prepare drafts for submission.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link>
              <Link className="action-item" href="/summary"><div><strong>Review totals and requirements</strong><span>Compare session and activity-day totals across your calendars.</span></div><span className="action-arrow" aria-hidden="true">→</span></Link>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="quick-links-heading">
            <div className="dashboard-section-header"><div><h2 id="quick-links-heading">Quick links</h2><p>Common program tasks.</p></div></div>
            <div className="quick-links">
              <Link className="quick-link" href="/calendars/new"><strong>Create a calendar</strong><span>Generate dates from a school year and normal weekdays.</span></Link>
              <Link className="quick-link" href="/summary"><strong>Program summary</strong><span>Review calendar totals in one place.</span></Link>
              <Link className="quick-link" href="/profile"><strong>Account profile</strong><span>Review account and program information.</span></Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
