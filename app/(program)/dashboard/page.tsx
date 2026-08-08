import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { logout } from '@/app/(auth)/actions'

export default async function DashboardPage() {
  const { user, profile, memberships, approvedMembership } = await getAccessState()

  if (!user) {
    redirect('/login')
  }

  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') {
    redirect('/admin/dashboard')
  }

  if (memberships.length === 0) {
    redirect('/select-program')
  }

  if (profile?.account_status !== 'APPROVED' || !approvedMembership) {
    redirect('/pending')
  }

  const relatedProgram = approvedMembership.programs
  const programName = Array.isArray(relatedProgram)
    ? relatedProgram[0]?.name
    : relatedProgram?.name

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">Oakland Schools Program Calendar</p>
            <h1>{programName ?? 'Program dashboard'}</h1>
            <p className="muted">
              Welcome, {profile?.first_name}. Calendar creation is the next implementation phase.
            </p>
          </div>

          <form action={logout}>
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <div className="grid">
          <div className="stat">
            <strong>Account</strong>
            <p className="success">Approved</p>
          </div>
          <div className="stat">
            <strong>Program access</strong>
            <p className="success">Approved</p>
          </div>
          <div className="stat">
            <strong>Calendar module</strong>
            <p>Not implemented yet</p>
          </div>
        </div>

        <div className="notice">
          Authentication, account approval, and program-level authorization are intentionally
          being validated before calendar features are added.
        </div>
      </section>
    </main>
  )
}
