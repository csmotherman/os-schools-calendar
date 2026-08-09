import Link from 'next/link'
import { redirect } from 'next/navigation'
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

  return <main className="page-shell"><section className="card card-wide stack">
    <div className="header-row"><div><p className="muted">Settings</p><h1>Calendar types</h1></div><Link className="button button-secondary" href="/admin/settings">Settings</Link></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <form action={createCalendarType} className="form-grid"><div className="field"><label htmlFor="code">Code</label><input id="code" name="code" placeholder="4_DAY_PART" required /></div><div className="field"><label htmlFor="name">Name</label><input id="name" name="name" placeholder="4-Day Part Day" required /></div><div className="field"><label htmlFor="days_per_week">Days/week</label><input id="days_per_week" name="days_per_week" type="number" min="1" max="7" required /></div><div className="field"><label htmlFor="day_length">Day length</label><select id="day_length" name="day_length"><option value="PART">Part Day</option><option value="FULL">Full Day</option></select></div><div className="field field-end"><button className="button" type="submit">Add type</button></div></form>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Days/week</th><th>Length</th><th>Status</th><th /></tr></thead><tbody>{(types ?? []).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.days_per_week}</td><td>{item.day_length}</td><td>{item.active ? 'Active' : 'Inactive'}</td><td><form action={setCalendarTypeActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div>
  </section></main>
}
