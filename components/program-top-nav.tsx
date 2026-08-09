import Link from 'next/link'
import { getAccessState } from '@/lib/auth/access'
import { logout } from '@/app/(auth)/actions'

export async function ProgramTopNav() {
  const { user, profile, approvedMembership } = await getAccessState()
  if (!user || !profile || !approvedMembership || profile.role === 'ADMIN') return null

  return (
    <header className="program-topbar">
      <div className="program-topbar-inner">
        <Link className="program-brand" href="/dashboard" aria-label="Oakland Schools GSRP calendar dashboard">
          <span className="program-brand-mark" aria-hidden="true">OS</span>
          <span><strong>Oakland Schools</strong><small>GSRP Calendar</small></span>
        </Link>
        <nav className="program-nav" aria-label="Primary navigation">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/calendars">Calendars</Link>
          <Link href="/summary">Summary</Link>
        </nav>
        <div className="program-nav-account">
          <span className="program-nav-program">{approvedMembership.programs?.name ?? 'Program'}</span>
          <Link className="program-nav-profile" href="/profile">Profile</Link>
          <form action={logout}><button className="program-nav-signout" type="submit">Sign out</button></form>
        </div>
      </div>
    </header>
  )
}
