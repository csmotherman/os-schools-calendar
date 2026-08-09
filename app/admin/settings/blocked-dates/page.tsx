import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { HelpModal } from '@/components/help-modal'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createBlockedDates, setBlockedDateActive } from '../actions'

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`))
}

export default async function BlockedDatesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const messages = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')
  const supabase = await createClient()
  const [datesResult, yearsResult] = await Promise.all([
    supabase.from('blocked_dates').select('id, school_year_id, date, name, restriction_type, active').order('date'),
    supabase.from('school_years').select('id, name, active').order('start_date', { ascending: false }),
  ])
  const yearMap = new Map((yearsResult.data ?? []).map((year) => [year.id, year.name]))

  return <main className="page-shell"><section className="card card-wide stack settings-shell">
    <div className="page-toolbar"><BackButton fallback="/admin/settings" /><HelpModal title="Blocked dates" intro="Blocked dates are district-wide calendar rules. You can add one date or a date range. Saturdays and Sundays are skipped automatically even if they fall inside the range." steps={['Choose the school year.', 'Enter the first date. For a single day, leave End date blank or use the same date.', 'For a break, choose an end date. Only Monday through Friday will be added.', 'No Session prevents children from being marked in session. No Session or Activity blocks both session and activities.']} /></div>
    <div className="settings-hero"><div><p className="side-eyebrow">Calendar rules</p><h1>Blocked dates</h1><p className="muted">Add holidays, closures, and district-wide breaks without entering each weekday one at a time.</p></div></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <section className="settings-panel"><div className="settings-panel-heading"><div><h2>Add blocked dates</h2><p className="muted">Weekend dates inside a range are ignored automatically.</p></div></div>
      <form action={createBlockedDates} className="form-grid settings-form-grid">
        <div className="field"><label htmlFor="school_year_id">School year</label><select id="school_year_id" name="school_year_id" required defaultValue=""><option value="" disabled>Select year</option>{(yearsResult.data ?? []).filter((year) => year.active).map((year) => <option value={year.id} key={year.id}>{year.name}</option>)}</select></div>
        <div className="field"><label htmlFor="start_date">Start date</label><input id="start_date" name="start_date" type="date" required /></div>
        <div className="field"><label htmlFor="end_date">End date <span className="optional-label">Optional</span></label><input id="end_date" name="end_date" type="date" /></div>
        <div className="field"><label htmlFor="name">Label</label><input id="name" name="name" placeholder="Winter Break" required /></div>
        <div className="field"><label htmlFor="restriction_type">What should be blocked?</label><select id="restriction_type" name="restriction_type"><option value="NO_SESSION">No Session</option><option value="NO_ACTIVITY">No Session or Activity</option></select></div>
        <div className="field field-end"><button className="button" type="submit">Add blocked weekdays</button></div>
      </form>
    </section>
    <section className="settings-panel"><div className="settings-panel-heading"><div><h2>Configured dates</h2><p className="muted">{(datesResult.data ?? []).length} total records</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>School year</th><th>Restriction</th><th>Status</th><th /></tr></thead><tbody>{(datesResult.data ?? []).map((item) => <tr key={item.id}><td><strong>{friendlyDate(item.date)}</strong></td><td>{item.name}</td><td>{yearMap.get(item.school_year_id) ?? '—'}</td><td>{item.restriction_type === 'NO_SESSION' ? 'No Session' : 'No Session or Activity'}</td><td><span className={`status-pill ${item.active ? 'status-approved' : 'status-draft'}`}>{item.active ? 'Active' : 'Inactive'}</span></td><td><form action={setBlockedDateActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div></section>
  </section></main>
}
