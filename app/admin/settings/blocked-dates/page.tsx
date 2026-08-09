import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createBlockedDate, setBlockedDateActive } from '../actions'

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

  return <main className="page-shell"><section className="card card-wide stack">
    <div className="header-row"><div><p className="muted">Settings</p><h1>Blocked dates</h1><p className="muted">District-wide restrictions are applied during generation and enforced on later edits.</p></div><Link className="button button-secondary" href="/admin/settings">Settings</Link></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <form action={createBlockedDate} className="form-grid">
      <div className="field"><label htmlFor="school_year_id">School year</label><select id="school_year_id" name="school_year_id" required defaultValue=""><option value="" disabled>Select year</option>{(yearsResult.data ?? []).filter((year) => year.active).map((year) => <option value={year.id} key={year.id}>{year.name}</option>)}</select></div>
      <div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" required /></div>
      <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" placeholder="Thanksgiving" required /></div>
      <div className="field"><label htmlFor="restriction_type">Restriction</label><select id="restriction_type" name="restriction_type"><option value="NO_SESSION">No Session</option><option value="NO_ACTIVITY">No Session or Activity</option></select></div>
      <div className="field field-end"><button className="button" type="submit">Add blocked date</button></div>
    </form>
    <div className="table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>School year</th><th>Restriction</th><th>Status</th><th /></tr></thead><tbody>{(datesResult.data ?? []).map((item) => <tr key={item.id}><td>{item.date}</td><td><strong>{item.name}</strong></td><td>{yearMap.get(item.school_year_id) ?? '—'}</td><td>{item.restriction_type.replaceAll('_', ' ')}</td><td>{item.active ? 'Active' : 'Inactive'}</td><td><form action={setBlockedDateActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div>
  </section></main>
}
