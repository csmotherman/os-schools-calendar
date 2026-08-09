import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { logout, resubmitProgramRequest } from '../actions'

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; resubmitted?: string }>
}) {
  const messages = await searchParams
  const { user, profile, memberships, approvedMembership } = await getAccessState()

  if (!user) redirect('/login')
  if (profile?.account_status === 'APPROVED' && approvedMembership) redirect('/dashboard')
  if (memberships.length === 0) redirect('/select-program')

  const membership = memberships[0]
  const programName = membership.programs?.name
  const declined = profile?.account_status === 'DECLINED' || membership.status === 'DECLINED'
  const disabled = profile?.account_status === 'DISABLED'

  return (
    <main className="page-shell centered-shell">
      <section className="card stack">
        <div>
          <p className="muted">Oakland Schools</p>
          <h1>{disabled ? 'Account disabled' : declined ? 'Access request declined' : 'Approval pending'}</h1>
        </div>

        {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}
        {messages.resubmitted ? <div className="alert alert-success">Your access request was resubmitted for review.</div> : null}

        <div className="stat">
          <strong>Program</strong><p>{programName ?? 'Program request'}</p>
          <strong>Account status</strong><p>{profile?.account_status ?? 'PENDING'}</p>
          <strong>Program request</strong><p>{membership.status}</p>
        </div>

        {!declined && !disabled ? <div className="notice">Your account cannot access program calendars until an administrator approves both your account and program affiliation.</div> : null}
        {declined && !disabled ? <div className="notice">If the program selection is still correct, you can resubmit the request for another administrator review.</div> : null}
        {disabled ? <div className="alert alert-error">This account has been disabled by an administrator. Contact Oakland Schools if access should be restored.</div> : null}

        {declined && !disabled ? (
          <form action={resubmitProgramRequest}>
            <input type="hidden" name="membership_id" value={membership.id} />
            <button className="button" type="submit">Resubmit access request</button>
          </form>
        ) : null}

        <form action={logout}><button className="button button-secondary" type="submit">Sign out</button></form>
      </section>
    </main>
  )
}
