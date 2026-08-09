import Link from 'next/link'
import { redirect } from 'next/navigation'
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

  return <main className="page-shell"><section className="card card-wide stack">
    <div className="header-row"><div><p className="muted">Settings</p><h1>Activity types</h1><p className="muted">Compatibility rules are enforced by PostgreSQL as well as the calendar editor.</p></div><Link className="button button-secondary" href="/admin/settings">Settings</Link></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <form action={createActivityType} className="stack"><div className="form-grid"><div className="field"><label htmlFor="code">Code</label><input id="code" name="code" placeholder="FIELD_TRIP" required /></div><div className="field"><label htmlFor="name">Name</label><input id="name" name="name" placeholder="Field Trip" required /></div></div><fieldset className="fieldset"><legend>Allowed when</legend><div className="checkbox-grid"><label className="checkbox-card"><input type="checkbox" name="allowed_when_in_session" value="true" /><span>Children are in session</span></label><label className="checkbox-card"><input type="checkbox" name="allowed_when_not_in_session" value="true" /><span>Children are not in session</span></label></div></fieldset><button className="button fit-button" type="submit">Add activity</button></form>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>In session</th><th>Not in session</th><th>Status</th><th /></tr></thead><tbody>{(activities ?? []).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.allowed_when_in_session ? 'Yes' : 'No'}</td><td>{item.allowed_when_not_in_session ? 'Yes' : 'No'}</td><td>{item.active ? 'Active' : 'Inactive'}</td><td><form action={setActivityTypeActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div>
  </section></main>
}
