import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { disableUser } from '../actions'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const { user, profile } = await getAccessState()

  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const [profilesResult, membershipsResult, programsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, account_status, created_at')
      .order('last_name'),
    supabase
      .from('program_memberships')
      .select('id, user_id, program_id, status, approved_at'),
    supabase.from('programs').select('id, name'),
  ])

  const membershipByUser = new Map(
    (membershipsResult.data ?? []).map((membership) => [membership.user_id, membership]),
  )
  const programMap = new Map((programsResult.data ?? []).map((program) => [program.id, program.name]))

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">Oakland Schools Administration</p>
            <h1>Users</h1>
            <p className="muted">Review account state, program affiliation, and disable access when necessary.</p>
          </div>
          <div className="actions-row">
            <Link className="button button-secondary" href="/admin/approvals">Approvals</Link>
            <Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link>
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Account</th>
                <th>Program</th>
                <th>Membership</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(profilesResult.data ?? []).map((item) => {
                const membership = membershipByUser.get(item.id)
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.first_name} {item.last_name}</strong>
                      <div className="muted small-text">Created {new Date(item.created_at).toLocaleDateString()}</div>
                    </td>
                    <td>{item.role}</td>
                    <td><span className="status-pill">{item.account_status}</span></td>
                    <td>{membership ? programMap.get(membership.program_id) ?? 'Unknown program' : '—'}</td>
                    <td>{membership?.status ?? '—'}</td>
                    <td>
                      {item.role !== 'ADMIN' && item.account_status !== 'DISABLED' ? (
                        <form action={disableUser}>
                          <input type="hidden" name="user_id" value={item.id} />
                          <button className="button button-danger button-small" type="submit">Disable</button>
                        </form>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
