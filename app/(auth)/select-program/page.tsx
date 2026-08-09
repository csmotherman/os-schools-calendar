import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { requestProgram } from '../actions'

export default async function SelectProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { user, memberships } = await getAccessState()

  if (!user) {
    redirect('/login')
  }

  if (memberships.length > 0) {
    redirect('/pending')
  }

  const supabase = await createClient()
  const { data: programs, error: programsError } = await supabase.rpc('list_active_programs')

  if (programsError) {
    console.error('Unable to load active program directory:', programsError)
  }

  return (
    <main className="page-shell centered-shell">
      <section className="card stack">
        <div>
          <p className="muted">Account setup</p>
          <h1>Select your program</h1>
          <p className="muted">
            This selection creates an access request. It does not grant access until
            an Oakland Schools administrator approves it.
          </p>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {programsError ? (
          <p className="error">Unable to load programs. Contact an administrator.</p>
        ) : null}

        <form action={requestProgram} className="stack">
          <div className="field">
            <label htmlFor="program_id">Program</label>
            <select id="program_id" name="program_id" defaultValue="" required>
              <option value="" disabled>
                Select your program
              </option>
              {(programs ?? []).map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <button className="button" type="submit" disabled={!programs?.length}>
            Request access
          </button>
        </form>
      </section>
    </main>
  )
}
