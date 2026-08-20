import type { Metadata } from 'next'
import { ProgramTopNav } from '@/components/program-top-nav'
import { AdminTopNav } from '@/components/admin-top-nav'
import './globals.css'
import './navigation.css'
import './modern-theme.css'
import './usability.css'
import './professional-ui.css'

export const metadata: Metadata = {
  title: 'Oakland Schools GSRP Calendar',
  description: 'Oakland Schools GSRP calendar management application',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ProgramTopNav />
        <AdminTopNav />
        {children}
      </body>
    </html>
  )
}
