import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

export default async function AuditLogPage() {
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const supabase = await createClient()
  const [logsResult, profilesResult, programsResult] = await Promise.all([
    supabase.from('audit_log').select('id, actor_user_id, action, entity_type, entity_id, program_id, calendar_id, before_data, after_data, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, first_name, last_name'),
    supabase.from('programs').select('id, name'),
  ])
  const actorMap = new Map((profilesResult.data ?? []).map((item) => [item.id, `${item.first_name} ${item.last_name}`]))
  const programMap = new Map((programsResult.data ?? []).map((item) => [item.id, item.name]))

  return <main className="page-shell"><section className="card card-wide stack">
    <div className="header-row"><div><p className="muted">Oakland Schools Administration</p><h1>Audit log</h1><p className="muted">Most recent 200 audited database changes.</p></div><Link className="button button-secondary" href="/admin/dashboard">Dashboard</Link></div>
    <div className="table-wrap"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Program</th><th>Details</th></tr></thead><tbody>{(logsResult.data ?? []).map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.actor_user_id ? actorMap.get(log.actor_user_id) ?? 'Unknown user' : 'System'}</td><td>{log.action}</td><td>{log.entity_type}</td><td>{log.program_id ? programMap.get(log.program_id) ?? 'Unknown program' : '—'}</td><td><details><summary>View</summary><pre className="json-block">{JSON.stringify({ before: log.before_data, after: log.after_data }, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
  </section></main>
}
