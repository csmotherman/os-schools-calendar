import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { HelpModal } from '@/components/help-modal'
import { getAccessState } from '@/lib/auth/access'

export default async function AdminSettingsPage() {
  const { user, profile } = await getAccessState()
  if (!user) redirect('/login')
  if (profile?.role !== 'ADMIN' || profile.account_status !== 'APPROVED') redirect('/dashboard')

  const items = [
    ['School years', 'Create school-year windows and control which years are available.', '/admin/settings/school-years', '01'],
    ['Blocked dates', 'Add holidays and closure ranges. Weekends are skipped automatically.', '/admin/settings/blocked-dates', '02'],
    ['Requirements', 'Set minimums, maximums, warnings, and blocking calendar rules.', '/admin/settings/requirements', '03'],
    ['Calendar types', 'Manage the available schedule patterns programs can choose.', '/admin/settings/calendar-types', '04'],
    ['Activity types', 'Control Half Day, Conference, PL, Home Visit, Break, and future activities.', '/admin/settings/activity-types', '05'],
  ] as const

  return <main className="page-shell"><section className="card card-wide stack settings-shell">
    <div className="page-toolbar"><BackButton fallback="/admin/dashboard" /><HelpModal title="Admin settings" intro="Settings control the options and rules used by every program calendar. Most changes should be made before programs begin building calendars for a school year." steps={['Set up the school year first.', 'Add district-wide blocked dates and breaks.', 'Confirm calendar types and activity types.', 'Add requirements last, after the reference options are correct.']} /></div>
    <div className="settings-hero"><div><p className="side-eyebrow">Oakland Schools Administration</p><h1>Settings</h1><p className="muted">Configure the shared rules and choices that drive every GSRP calendar.</p></div></div>
    <div className="settings-menu">{items.map(([title, description, href, number]) => <Link className="settings-menu-card" href={href} key={href}><span className="settings-menu-number">{number}</span><div><strong>{title}</strong><span>{description}</span></div><span className="settings-menu-arrow" aria-hidden="true">→</span></Link>)}</div>
  </section></main>
}
