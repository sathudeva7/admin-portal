'use client'

import styles from './Sidebar.module.css'

interface SidebarProps {
  activeNav?: string
}

export default function Sidebar({ activeNav = 'AI Knowledge Base' }: SidebarProps) {
  const navItems = [
    { section: 'Main', items: [
      { icon: '📊', label: 'Dashboard',  href: '/dashboard' },
      { icon: '📹', label: 'Videos',     href: '#' },
      { icon: '👥', label: 'Users',      href: '#' },
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
      { icon: '📢', label: 'Notifications',  href: '#' },
      { icon: '📺', label: 'Live Sessions',  href: '/go-live' },
    ]},
    { section: 'Finance', items: [
      { icon: '💳', label: 'Donations', href: '#' },
      { icon: '⚙️', label: 'Settings',  href: '#' },
    ]},
  ]

  return (
    <aside className={styles.sidebar}>
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
        {navItems.map((group) => (
          <div key={group.section}>
            <div className={styles.navSection}>{group.section}</div>
            {group.items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`${styles.navItem} ${item.label === activeNav ? styles.active : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.user}>
        <div className={styles.avatar}>👤</div>
        <div>
          <div className={styles.username}>Rabbi Landau</div>
          <div className={styles.role}>Super Admin</div>
        </div>
      </div>
    </aside>
  )
}
