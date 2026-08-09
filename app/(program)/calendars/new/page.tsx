import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createCalendar } from '../actions'

const weekdays = [
  ['1', 'Monday'],
  ['2', 'Tuesday'],
  ['3', 'Wednesday'],
  ['4', 'Thursday'],
  ['5', 'Friday'],
  ['6', 'Saturday'],
  ['0', 'Sunday'],
] as const

export default async function NewCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { user, profile, approvedMembership } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role === 'ADMIN' && profile.account_status === 'APPROVED') redirect('/admin/dashboard')
  if (profile?.account_status !== 'APPROVED' || !approvedMembership) redirect('/pending')

  const supabase = await createClient()
  const [yearsResult, typesResult] = await Promise.all([
    supabase
      .from('school_years')
      .select('id, name, start_date, end_date')
      .eq('active', true)
      .order('start_date', { ascending: false }),
    supabase
      .from('calendar_types')
      .select('id, name, days_per_week, day_length')
      .eq('active', true)
      .order('display_order'),
  ])

  return (
    <main className="page-shell">
      <section className="card card-wide stack">
        <div className="header-row">
          <div>
            <p className="muted">{approvedMembership.programs?.name}</p>
            <h1>Create calendar</h1>
            <p className="muted">Choose the calendar type, date range, and normal session weekdays. District blocked dates are applied automatically.</p>
          </div>
          <Link className="button button-secondary" href="/calendars">Cancel</Link>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form action={createCalendar} className="stack">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="school_year_id">School year</label>
              <select id="school_year_id" name="school_year_id" required defaultValue="">
                <option value="" disabled>Select school year</option>
                {(yearsResult.data ?? []).map((year) => (
                  <option value={year.id} key={year.id}>{year.name} ({year.start_date} – {year.end_date})</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="calendar_type_id">Calendar type</label>
              <select id="calendar_type_id" name="calendar_type_id" required defaultValue="">
                <option value="" disabled>Select calendar type</option>
                {(typesResult.data ?? []).map((type) => (
                  <option value={type.id} key={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="start_date">First calendar date</label>
              <input id="start_date" name="start_date" type="date" required />
            </div>

            <div className="field">
              <label htmlFor="end_date">Last calendar date</label>
              <input id="end_date" name="end_date" type="date" required />
            </div>
          </div>

          <fieldset className="fieldset">
            <legend>Normal session weekdays</legend>
            <p className="muted small-text">Select exactly the number of weekdays required by the calendar type (four for a 4-Day calendar, five for a 5-Day calendar).</p>
            <div className="checkbox-grid">
              {weekdays.map(([value, label]) => (
                <label className="checkbox-card" key={value}>
                  <input type="checkbox" name="session_weekdays" value={value} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="notice">Every date in the selected range will be created. Normal weekdays are marked In Session automatically, while active district blocked dates are forced out of session.</div>

          <button className="button fit-button" type="submit">Generate calendar</button>
        </form>
      </section>
    </main>
  )
}
