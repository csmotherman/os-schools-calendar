import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { HelpModal } from '@/components/help-modal'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createSchoolYear, setSchoolYearActive } from '../actions'

export default async function SchoolYearsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const messages = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')
  const supabase = await createClient()
  const { data: years } = await supabase.from('school_years').select('id, name, start_date, end_date, active').order('start_date', { ascending: false })
  return <main className="page-shell"><section className="card card-wide stack settings-shell">
    <div className="page-toolbar"><BackButton fallback="/admin/settings" /><HelpModal title="School years" intro="School years define the outer date boundaries for every calendar. Programs cannot create calendar dates outside the selected school year." steps={['Use a short recognizable name such as 2026-27.', 'Set the earliest and latest dates allowed for that year.', 'Deactivate old years when programs should no longer create calendars in them.']} /></div>
    <div className="settings-hero"><div><p className="side-eyebrow">Calendar setup</p><h1>School years</h1><p className="muted">Control which academic-year ranges are available to programs.</p></div></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <section className="settings-panel"><div className="settings-panel-heading"><div><h2>Add school year</h2><p className="muted">Create the date boundaries before configuring rules for that year.</p></div></div><form action={createSchoolYear} className="form-grid settings-form-grid"><div className="field"><label htmlFor="name">Name</label><input id="name" name="name" placeholder="2027-28" required /></div><div className="field"><label htmlFor="start_date">Start date</label><input id="start_date" name="start_date" type="date" required /></div><div className="field"><label htmlFor="end_date">End date</label><input id="end_date" name="end_date" type="date" required /></div><div className="field field-end"><button className="button" type="submit">Add school year</button></div></form></section>
    <section className="settings-panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Start</th><th>End</th><th>Status</th><th /></tr></thead><tbody>{(years ?? []).map((year) => <tr key={year.id}><td><strong>{year.name}</strong></td><td>{year.start_date}</td><td>{year.end_date}</td><td><span className={`status-pill ${year.active ? 'status-approved' : 'status-draft'}`}>{year.active ? 'Active' : 'Inactive'}</span></td><td><form action={setSchoolYearActive}><input type="hidden" name="id" value={year.id} /><input type="hidden" name="active" value={year.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{year.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div></section>
  </section></main>
}
