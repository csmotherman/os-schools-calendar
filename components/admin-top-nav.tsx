import Link from 'next/link'
import { getAccessState } from '@/lib/auth/access'
import { logout } from '@/app/(auth)/actions'

export async function AdminTopNav() {
  const { user, profile } = await getAccessState()
  if (!user || profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') return null

  return <header className="admin-topbar">
    <div className="admin-topbar-inner">
      <Link className="admin-brand" href="/admin/dashboard"><span className="admin-brand-mark" aria-hidden="true">OS</span><span><strong>Oakland Schools</strong><small>GSRP Administration</small></span></Link>
      <nav className="admin-nav" aria-label="Admin navigation">
        <Link href="/admin/dashboard">Dashboard</Link>
        <Link href="/admin/approvals">Approvals</Link>
        <Link href="/admin/calendars">Calendars</Link>
        <Link href="/admin/programs">Programs</Link>
        <Link href="/admin/users">Users</Link>
        <Link href="/admin/reports">Reports</Link>
        <Link href="/admin/settings">Settings</Link>
        <Link href="/admin/audit-log">Audit log</Link>
      </nav>
      <div className="admin-nav-account"><span>{profile.first_name} {profile.last_name}</span><form action={logout}><button className="program-nav-signout" type="submit">Sign out</button></form></div>
    </div>
  </header>
}
