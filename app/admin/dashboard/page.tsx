import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'

export default async function AdminDashboardPage() {
  const { user, profile } = await getAccessState()

  if (!user) {
    redirect('/login')
  }

  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const [pendingProfiles, pendingMemberships, calendars] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'PENDING'),
    supabase
      .from('program_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING'),
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
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <div className="grid">
          <div className="stat">
            <strong>Pending accounts</strong>
            <p>{pendingProfiles.count ?? 0}</p>
          </div>
          <div className="stat">
            <strong>Pending program requests</strong>
            <p>{pendingMemberships.count ?? 0}</p>
          </div>
          <div className="stat">
            <strong>Calendars</strong>
            <p>{calendars.count ?? 0}</p>
          </div>
        </div>

        <div className="notice">
          Administrative approval controls and calendar management are the next implementation
          slice after the authentication flow is validated end to end.
        </div>
      </section>
    </main>
  )
}
