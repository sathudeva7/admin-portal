'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const NO_SIDEBAR_PATHS = ['/login', '/signup']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname)

  if (!showSidebar) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      {children}
    </div>
  )
}
