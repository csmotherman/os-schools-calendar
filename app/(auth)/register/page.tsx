import Link from 'next/link'
import { register } from '../actions'

export default async function RegisterPage({
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
          <h1>Create an account</h1>
          <p className="muted">
            Enter your identity first. After your email is verified, you will select
            your program and send an access request to Oakland Schools.
          </p>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <form action={register} className="stack">
          <div className="field">
            <label htmlFor="first_name">First name</label>
            <input id="first_name" name="first_name" autoComplete="given-name" required />
          </div>

          <div className="field">
            <label htmlFor="last_name">Last name</label>
            <input id="last_name" name="last_name" autoComplete="family-name" required />
          </div>

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
              minLength={10}
              autoComplete="new-password"
              required
            />
            <span className="muted">Minimum 10 characters.</span>
          </div>

          <button className="button" type="submit">
            Continue
          </button>
        </form>

        <p className="muted">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
