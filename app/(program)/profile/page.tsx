import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessState } from '@/lib/auth/access'
import { updateProfile } from './actions'

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const messages = await searchParams
  const { user, profile, approvedMembership } = await getAccessState()
  if (!user) redirect('/login')
  if (!profile) redirect('/pending')

  return <main className="page-shell"><section className="card stack">
    <div className="header-row"><div><p className="muted">Account</p><h1>Profile</h1></div><Link className="button button-secondary" href={profile.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}>Back</Link></div>
    {messages.error ? <div className="alert alert-error">{messages.error}</div> : null}{messages.success ? <div className="alert alert-success">{messages.success}</div> : null}
    <form action={updateProfile} className="stack"><div className="field"><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" defaultValue={profile.first_name} required /></div><div className="field"><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" defaultValue={profile.last_name} required /></div><button className="button fit-button" type="submit">Save profile</button></form>
    <div className="stat"><strong>Email</strong><p>{user.email ?? '—'}</p><strong>Role</strong><p>{profile.role.replaceAll('_', ' ')}</p><strong>Account status</strong><p>{profile.account_status}</p>{approvedMembership ? <><strong>Program</strong><p>{approvedMembership.programs?.name ?? 'Approved program'}</p></> : null}</div>
  </section></main>
}
