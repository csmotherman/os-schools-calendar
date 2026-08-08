import Link from 'next/link'
import { requestPasswordReset } from '../actions'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const { error, sent } = await searchParams

  return (
    <main className="page-shell centered-shell">
      <section className="card stack">
        <div>
          <p className="muted">Oakland Schools</p>
          <h1>Reset password</h1>
          <p className="muted">Enter the email associated with your account.</p>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {sent ? (
          <p className="success">If that account exists, a reset email has been sent.</p>
        ) : null}

        <form action={requestPasswordReset} className="stack">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <button className="button" type="submit">
            Send reset email
          </button>
        </form>

        <p className="muted">
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  )
}
