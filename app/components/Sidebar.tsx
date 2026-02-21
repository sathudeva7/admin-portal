'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminAuth } from '../lib/useAdminAuth'
import styles from './Sidebar.module.css'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  moderator:   'Moderator',
  rabbi:       'Rabbi',
}

interface NavItem {
  icon:   string
  label:  string
  href:   string
  badge?: number
}

interface NavGroup {
  section: string
  items:   NavItem[]
}

const PATH_TO_NAV: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/videos':           'Videos',
  '/users':            'Users',
  '/community':        'Community',
  '/knowledge-base':   'AI Knowledge Base',
  '/go-live':          'Live Sessions',
  '/notifications':    'Notifications',
  '/donations':        'Donations',
  '/admin-management': 'Admin Management',
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { role, displayName } = useAdminAuth()

  const handleNavClick = () => {
    onClose?.()
  }

  const activeNav = PATH_TO_NAV[pathname] ?? ''
  const isSuperAdmin = role === 'super_admin'

  const navGroups: NavGroup[] = [
    { section: 'Main', items: [
      { icon: '📊', label: 'Dashboard',  href: '/dashboard' },
      { icon: '📹', label: 'Videos',     href: '/videos' },
      { icon: '👥', label: 'Users',      href: '/users' },
    ]},
    { section: 'Moderation', items: [
      { icon: '💬', label: 'Community',  href: '/community', badge: 3 },
      { icon: '🤖', label: 'AI Queue',   href: '#', badge: 7 },
    ]},
    { section: 'AI Brain', items: [
      { icon: '🧠', label: 'AI Knowledge Base', href: '/knowledge-base' },
      { icon: '⚙️', label: 'AI Coach Settings', href: '#' },
    ]},
    { section: 'Broadcast', items: [
      { icon: '📢', label: 'Notifications', href: '/notifications' },
      { icon: '📺', label: 'Live Sessions', href: '/go-live' },
    ]},
    { section: 'Finance', items: [
      { icon: '💳', label: 'Donations', href: '/donations' },
      { icon: '⚙️', label: 'Settings',  href: '#' },
    ]},
    ...(isSuperAdmin ? [{
      section: 'System',
      items: [{ icon: '🛡️', label: 'Admin Management', href: '/admin-management' }],
    }] : []),
  ]

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {onClose && (
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      )}
      <div className={styles.logo}>
        <div className={styles.logoTop}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <div>
            <div className={styles.logoName}>Rivnitz</div>
            <div className={styles.logoSub}>Admin Portal</div>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <div key={group.section}>
            <div className={styles.navSection}>{group.section}</div>
            {group.items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`${styles.navItem} ${item.label === activeNav ? styles.active : ''}`}
                onClick={handleNavClick}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.user}>
        <div className={styles.avatar}>👤</div>
        <div>
          <div className={styles.username}>{displayName ?? '—'}</div>
          <div className={styles.role}>{role ? ROLE_LABELS[role] : ''}</div>
        </div>
      </div>
    </aside>
  )
}
