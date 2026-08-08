import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Oakland Schools Calendar',
  description: 'Oakland Schools GSRP calendar management application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
