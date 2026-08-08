import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { updatePassword } from '../actions'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { user } = await getAccessState()

  if (!user) {
    redirect('/login?error=Open the password reset link from your email first.')
  }

  return (
    <main className="page-shell centered-shell">
      <section className="card stack">
        <div>
          <p className="muted">Oakland Schools</p>
          <h1>Choose a new password</h1>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <form action={updatePassword} className="stack">
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={10}
              autoComplete="new-password"
              required
            />
          </div>
          <button className="button" type="submit">
            Update password
          </button>
        </form>
      </section>
    </main>
  )
}
