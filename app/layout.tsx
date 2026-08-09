import type { Metadata } from 'next'
import { ProgramTopNav } from '@/components/program-top-nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Oakland Schools Calendar',
  description: 'Oakland Schools GSRP calendar management application',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ProgramTopNav />
        {children}
      </body>
    </html>
  )
}
