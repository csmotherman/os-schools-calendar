import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { HelpModal } from '@/components/help-modal'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createCalendarType, setCalendarTypeActive } from '../actions'

export default async function CalendarTypesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const messages = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')
  const supabase = await createClient()
  const { data: types } = await supabase.from('calendar_types').select('id, code, name, days_per_week, day_length, active').order('display_order')
  return <main className="page-shell"><section className="card card-wide stack settings-shell">
    <div className="page-toolbar"><BackButton fallback="/admin/settings" /><HelpModal title="Calendar types" intro="Calendar types define the schedule pattern a program can choose when creating a calendar." steps={['Use a clear display name such as 4-Day Part Day.', 'Days/week controls how many normal session weekdays the user must choose.', 'Day length is descriptive for the schedule type; the current calendar only counts days, not hours.', 'Deactivate a type instead of deleting it when it should no longer be selected.']} /></div>
    <div className="settings-hero"><div><p className="side-eyebrow">Calendar setup</p><h1>Calendar types</h1><p className="muted">Manage the schedule options programs can select when creating calendars.</p></div></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <section className="settings-panel"><div className="settings-panel-heading"><div><h2>Add calendar type</h2><p className="muted">Keep names user-friendly; the code is primarily for the system.</p></div></div><form action={createCalendarType} className="form-grid settings-form-grid"><div className="field"><label htmlFor="name">Display name</label><input id="name" name="name" placeholder="4-Day Part Day" required /></div><div className="field"><label htmlFor="code">System code</label><input id="code" name="code" placeholder="4_DAY_PART" required /></div><div className="field"><label htmlFor="days_per_week">Normal days/week</label><input id="days_per_week" name="days_per_week" type="number" min="1" max="7" required /></div><div className="field"><label htmlFor="day_length">Day length</label><select id="day_length" name="day_length"><option value="PART">Part Day</option><option value="FULL">Full Day</option></select></div><div className="field field-end"><button className="button" type="submit">Add calendar type</button></div></form></section>
    <section className="settings-panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Days/week</th><th>Length</th><th>Status</th><th /></tr></thead><tbody>{(types ?? []).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.days_per_week}</td><td>{item.day_length === 'PART' ? 'Part Day' : 'Full Day'}</td><td><span className={`status-pill ${item.active ? 'status-approved' : 'status-draft'}`}>{item.active ? 'Active' : 'Inactive'}</span></td><td><form action={setCalendarTypeActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div></section>
  </section></main>
}
