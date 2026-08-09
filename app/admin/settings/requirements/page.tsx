import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { HelpModal } from '@/components/help-modal'
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

  return <main className="page-shell"><section className="card card-wide stack settings-shell">
    <div className="page-toolbar"><BackButton fallback="/admin/settings" /><HelpModal title="Requirements" intro="Requirements compare a calendar's totals against a minimum, maximum, or both. Blocking rules stop submission; warnings inform the program and reviewer without stopping workflow." steps={['Choose the school year and calendar type.', 'Choose Session days or Activity days.', 'If using Activity days, choose the activity being counted.', 'Enter a minimum, maximum, or both.', 'Use Block submission only for rules that truly make a calendar invalid.']} /></div>
    <div className="settings-hero"><div><p className="side-eyebrow">Validation rules</p><h1>Requirements</h1><p className="muted">Define the thresholds programs see while building and submitting calendars.</p></div></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <section className="settings-panel"><div className="settings-panel-heading"><div><h2>Add requirement</h2><p className="muted">Keep the form focused on the rule you are trying to enforce.</p></div></div><form action={createRequirement} className="stack"><div className="form-grid settings-form-grid"><div className="field"><label htmlFor="school_year_id">School year</label><select id="school_year_id" name="school_year_id" required defaultValue=""><option value="" disabled>Select year</option>{(yearsResult.data ?? []).filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="calendar_type_id">Calendar type</label><select id="calendar_type_id" name="calendar_type_id" required defaultValue=""><option value="" disabled>Select type</option>{(typesResult.data ?? []).filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="metric_type">Count</label><select id="metric_type" name="metric_type"><option value="SESSION_DAYS">Session days</option><option value="ACTIVITY_DAYS">Activity days</option></select></div><div className="field"><label htmlFor="activity_type_id">Activity <span className="optional-label">Only for activity rules</span></label><select id="activity_type_id" name="activity_type_id" defaultValue=""><option value="">Not applicable</option>{(activitiesResult.data ?? []).filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="minimum_count">Minimum <span className="optional-label">Optional</span></label><input id="minimum_count" name="minimum_count" type="number" min="0" /></div><div className="field"><label htmlFor="maximum_count">Maximum <span className="optional-label">Optional</span></label><input id="maximum_count" name="maximum_count" type="number" min="0" /></div><div className="field"><label htmlFor="severity">Behavior</label><select id="severity" name="severity"><option value="BLOCK">Block submission</option><option value="WARNING">Warning only</option></select></div></div><button className="button fit-button" type="submit">Add requirement</button></form></section>
    <section className="settings-panel"><div className="table-wrap"><table><thead><tr><th>Year</th><th>Calendar type</th><th>Count</th><th>Min</th><th>Max</th><th>Behavior</th><th>Status</th><th /></tr></thead><tbody>{(requirementsResult.data ?? []).map((item) => <tr key={item.id}><td>{yearMap.get(item.school_year_id) ?? '—'}</td><td>{typeMap.get(item.calendar_type_id) ?? '—'}</td><td>{item.metric_type === 'SESSION_DAYS' ? 'Session days' : `${activityMap.get(item.activity_type_id ?? '') ?? 'Activity'} days`}</td><td>{item.minimum_count ?? '—'}</td><td>{item.maximum_count ?? '—'}</td><td>{item.severity === 'BLOCK' ? 'Block submission' : 'Warning only'}</td><td><span className={`status-pill ${item.active ? 'status-approved' : 'status-draft'}`}>{item.active ? 'Active' : 'Inactive'}</span></td><td><form action={setRequirementActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={item.active ? 'false' : 'true'} /><button className="button button-secondary button-small" type="submit">{item.active ? 'Deactivate' : 'Reactivate'}</button></form></td></tr>)}</tbody></table></div></section>
  </section></main>
}
