import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'
import { createRequirement, setRequirementActive } from '../actions'

export default async function RequirementsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const messages = await searchParams
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')
  const supabase = await createClient()
  const [requirementsResult, yearsResult, typesResult, activitiesResult] = await Promise.all([
    supabase.from('requirements').select('id, school_year_id, calendar_type_id, metric_type, activity_type_id, minimum_count, maximum_count, severity, active').order('created_at', { ascending: false }),
    supabase.from('school_years').select('id, name, active').order('start_date', { ascending: false }),
    supabase.from('calendar_types').select('id, name, active').order('display_order'),
    supabase.from('activity_types').select('id, name, active').order('display_order'),
  ])
  const yearMap = new Map((yearsResult.data ?? []).map((item) => [item.id, item.name]))
  const typeMap = new Map((typesResult.data ?? []).map((item) => [item.id, item.name]))
  const activityMap = new Map((activitiesResult.data ?? []).map((item) => [item.id, item.name]))

  return <main className="page-shell"><section className="card card-wide stack">
    <div className="header-row"><div><p className="muted">Settings</p><h1>Requirements</h1><p className="muted">Blocking rules prevent submission and approval when the current calendar count is outside its allowed range.</p></div><Link className="button button-secondary" href="/admin/settings">Settings</Link></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <form action={createRequirement} className="stack">
      <div className="form-grid">
        <div className="field"><label htmlFor="school_year_id">School year</label><select id="school_year_id" name="school_year_id" required defaultValue=""><option value="" disabled>Select year</option>{(yearsResult.data ?? []).filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label htmlFor="calendar_type_id">Calendar type</label><select id="calendar_type_id" name="calendar_type_id" required defaultValue=""><option value="" disabled>Select type</option>{(typesResult.data ?? []).filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label htmlFor="metric_type">Metric</label><select id="metric_type" name="metric_type"><option value="SESSION_DAYS">Session days</option><option value="ACTIVITY_DAYS">Activity days</option></select></div>
        <div className="field"><label htmlFor="activity_type_id">Activity (for activity-day rules)</label><select id="activity_type_id" name="activity_type_id" defaultValue=""><option value="">None / session days</option>{(activitiesResult.data ?? []).filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label htmlFor="minimum_count">Minimum</label><input id="minimum_count" name="minimum_count" type="number" min="0" /></div>
        <div className="field"><label htmlFor="maximum_count">Maximum</label><input id="maximum_count" name="maximum_count" type="number" min="0" /></div>
        <div className="field"><label htmlFor="severity">Severity</label><select id="severity" name="severity"><option value="BLOCK">Block submission</option><option value="WARNING">Warning only</option></select></div>
      </div>
      <button className="button fit-button" type="submit">Add requirement</button>
    </form>
    <div className="table-wrap"><table><thead><tr><th>Year</th><th>Calendar type</th><th>Metric</th><th>Min</th><th>Max</th><th>Severity</th><th>Status</th><th /></tr></thead><tbody>{(requirementsResult.data ?? []).map((item) => <tr key={item.id}><td>{yearMap.get(item.school_year_id) ?? '—'}</td><td>{typeMap.get(item.calendar_type_id) ?? '—'}</td><td>{item.metric_type === 'SESSION_DAYS' ? 'Session days' : `${activityMap.get(item.activity_type_id ?? '') ?? 'Activity'} days`}</td><td>{item.minimum_count ?? '—'}</td><td>{item.maximum_count ?? '—'}</td><td>{item.severity}</td><td>{item.active ? 'Active' : 'Inactive'}</td><td><form action={setRequirementActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div>
  </section></main>
}
