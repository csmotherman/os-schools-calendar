import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createProgram, setProgramActive } from './actions'

export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  const { data: programs } = await supabase.from('programs').select('id, name, active, created_at').order('name')

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div><p className="muted">Oakland Schools Administration</p><h1>Programs</h1><p className="muted">Maintain the official program dropdown used during account setup.</p></div>
          <Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <form action={createProgram} className="inline-create-form">
          <div className="field grow-field"><label htmlFor="name">New program name</label><input id="name" name="name" required /></div>
          <button className="button" type="submit">Add program</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Program</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {(programs ?? []).map((program) => (
                <tr key={program.id}>
                  <td><Link href={`/admin/programs/${program.id}`}><strong>{program.name}</strong></Link></td>
                  <td><span className={`status-pill ${program.active ? 'status-approved' : ''}`}>{program.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  <td>{new Date(program.created_at).toLocaleDateString()}</td>
                  <td>
                    <form action={setProgramActive}>
                      <input type="hidden" name="program_id" value={program.id} />
                      <input type="hidden" name="active" value={program.active ? 'false' : 'true'} />
                      <button className="button button-secondary button-small" type="submit">{program.active ? 'Deactivate' : 'Reactivate'}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
