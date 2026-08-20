import { redirect } from 'next/navigation'
import { ProgramAccessForm } from '@/components/program-access-form'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

export default async function SelectProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { user, memberships } = await getAccessState()

  if (!user) redirect('/login')
  if (memberships.length > 0) redirect('/pending')

  const supabase = await createClient()
  const { data: programs, error: programsError } = await supabase.rpc('list_active_programs')

  if (programsError) console.error('Unable to load active program directory:', programsError)

  return (
    <main className="page-shell centered-shell">
      <section className="card stack program-selection-card">
        <div>
          <p className="muted">Account setup</p>
          <h1>Select your program</h1>
          <p className="muted">Search the Oakland Schools program directory and choose the organization you represent. Your selection creates an access request; it does not grant access until an administrator approves it.</p>
        </div>

        {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
        {programsError ? <div className="alert alert-error" role="alert">Unable to load programs. Contact an administrator.</div> : null}
        {!programsError ? <ProgramAccessForm programs={programs ?? []} /> : null}
      </section>
    </main>
  )
}
