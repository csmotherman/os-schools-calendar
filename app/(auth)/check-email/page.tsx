import Link from 'next/link'

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <main className="page-shell centered-shell">
      <section className="card stack">
        <div>
          <p className="muted">Oakland Schools</p>
          <h1>Check your email</h1>
        </div>

        <p>
          We sent a confirmation link{email ? ` to ${email}` : ''}. Confirm your
          email to continue your account setup.
        </p>

        <div className="notice">
          After confirmation, you will choose your program. Program access remains
          pending until an Oakland Schools administrator approves the request.
        </div>

        <p className="muted">
          Already confirmed? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
