import Link from 'next/link'
import { redirect } from 'next/navigation'
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

  return <main className="page-shell"><section className="card card-wide stack">
    <div className="header-row"><div><p className="muted">Settings</p><h1>School years</h1></div><Link className="button button-secondary" href="/admin/settings">Settings</Link></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <form action={createSchoolYear} className="form-grid"><div className="field"><label htmlFor="name">Name</label><input id="name" name="name" placeholder="2027-28" required /></div><div className="field"><label htmlFor="start_date">Start date</label><input id="start_date" name="start_date" type="date" required /></div><div className="field"><label htmlFor="end_date">End date</label><input id="end_date" name="end_date" type="date" required /></div><div className="field field-end"><button className="button" type="submit">Add school year</button></div></form>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Start</th><th>End</th><th>Status</th><th /></tr></thead><tbody>{(years ?? []).map((year) => <tr key={year.id}><td><strong>{year.name}</strong></td><td>{year.start_date}</td><td>{year.end_date}</td><td>{year.active ? 'Active' : 'Inactive'}</td><td><form action={setSchoolYearActive}><input type="hidden" name="id" value={year.id} /><input type="hidden" name="active" value={year.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{year.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div>
  </section></main>
}
