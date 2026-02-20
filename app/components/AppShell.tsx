'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import styles from './AppShell.module.css'

const NO_SIDEBAR_PATHS = ['/login', '/signup']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (!showSidebar) return <>{children}</>

  return (
    <div className={styles.layout}>
      <button
        className={styles.mobileMenuBtn}
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>
      {mobileSidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
