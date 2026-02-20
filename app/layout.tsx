import type { Metadata } from 'next'
import './globals.css'
import AppShell from './components/AppShell'

export const metadata: Metadata = {
  title: 'Rivnitz — AI Knowledge Base',
  description: 'Rivnitz Admin Portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
