import Link from 'next/link'
import { login } from '../actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="page-shell centered-shell">
      <section className="card stack">
        <div>
          <p className="muted">Oakland Schools</p>
          <h1>Program Calendar</h1>
          <p className="muted">Sign in with your program account.</p>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <form action={login} className="stack">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button className="button" type="submit">
            Sign in
          </button>
        </form>

        <p className="muted">
          Need an account? <Link href="/register">Create one</Link>
        </p>
        <p className="muted">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      </section>
    </main>
  )
}
