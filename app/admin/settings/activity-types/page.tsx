import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { HelpModal } from '@/components/help-modal'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createActivityType, setActivityTypeActive } from '../actions'

export default async function ActivityTypesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const messages = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')
  const supabase = await createClient()
  const { data: activities } = await supabase.from('activity_types').select('id, code, name, allowed_when_in_session, allowed_when_not_in_session, active').order('display_order')
  return <main className="page-shell"><section className="card card-wide stack settings-shell">
    <div className="page-toolbar"><BackButton fallback="/admin/settings" /><HelpModal title="Activity types" intro="Activities are the checkboxes programs can apply to calendar dates. The allowed-state choices prevent invalid combinations in both the editor and database." steps={['Use a plain-language name programs will recognize.', 'Choose whether the activity can occur when children are in session, not in session, or both.', 'For example, Half Day usually requires children in session, while Break usually requires no session.', 'Deactivate old activities instead of deleting historical data.']} /></div>
    <div className="settings-hero"><div><p className="side-eyebrow">Calendar setup</p><h1>Activity types</h1><p className="muted">Control the day-level options available to programs.</p></div></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <section className="settings-panel"><div className="settings-panel-heading"><div><h2>Add activity type</h2><p className="muted">Compatibility settings are enforced automatically when users edit dates.</p></div></div><form action={createActivityType} className="stack"><div className="form-grid settings-form-grid"><div className="field"><label htmlFor="name">Display name</label><input id="name" name="name" placeholder="Field Trip" required /></div><div className="field"><label htmlFor="code">System code</label><input id="code" name="code" placeholder="FIELD_TRIP" required /></div></div><fieldset className="fieldset"><legend>When can this activity be used?</legend><div className="checkbox-grid"><label className="checkbox-card"><input type="checkbox" name="allowed_when_in_session" value="true" /><span>Children are in session</span></label><label className="checkbox-card"><input type="checkbox" name="allowed_when_not_in_session" value="true" /><span>Children are not in session</span></label></div></fieldset><button className="button fit-button" type="submit">Add activity type</button></form></section>
    <section className="settings-panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>In session</th><th>Not in session</th><th>Status</th><th /></tr></thead><tbody>{(activities ?? []).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.allowed_when_in_session ? 'Allowed' : 'Not allowed'}</td><td>{item.allowed_when_not_in_session ? 'Allowed' : 'Not allowed'}</td><td><span className={`status-pill ${item.active ? 'status-approved' : 'status-draft'}`}>{item.active ? 'Active' : 'Inactive'}</span></td><td><form action={setActivityTypeActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div></section>
  </section></main>
}
