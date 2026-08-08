import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { logout } from '../actions'

export default async function PendingPage() {
  const { user, profile, memberships, approvedMembership } = await getAccessState()

  if (!user) {
    redirect('/login')
  }

  if (profile?.account_status === 'APPROVED' && approvedMembership) {
    redirect('/dashboard')
  }

  if (memberships.length === 0) {
    redirect('/select-program')
  }

  const membership = memberships[0]
  const relatedProgram = membership.programs
  const programName = Array.isArray(relatedProgram)
    ? relatedProgram[0]?.name
    : relatedProgram?.name

  const declined =
    profile?.account_status === 'DECLINED' || membership.status === 'DECLINED'
  const disabled = profile?.account_status === 'DISABLED'

  return (
    <main className="page-shell centered-shell">
      <section className="card stack">
        <div>
          <p className="muted">Oakland Schools</p>
          <h1>
            {disabled
              ? 'Account disabled'
              : declined
                ? 'Access request declined'
                : 'Approval pending'}
          </h1>
        </div>

        <div className="stat">
          <strong>Program</strong>
          <p>{programName ?? 'Program request'}</p>
          <strong>Account status</strong>
          <p>{profile?.account_status ?? 'PENDING'}</p>
          <strong>Program request</strong>
          <p>{membership.status}</p>
        </div>

        {!declined && !disabled ? (
          <div className="notice">
            Your account cannot access program calendars until an administrator
            approves both your account and program affiliation.
          </div>
        ) : null}

        <form action={logout}>
          <button className="button button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </main>
  )
}
