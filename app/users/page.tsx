'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  orderBy, query, limit, startAfter, serverTimestamp,
  QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import styles from './page.module.css'

const PAGE_SIZE = 20

interface User {
  uid:                    string
  email:                  string
  displayName:            string
  photoURL?:              string | null
  phoneNumber?:           string | null
  hebrewName?:            string | null
  mothersName?:           string | null
  membershipTier:         'free' | 'premium'
  suspended?:             boolean
  hasCompletedOnboarding?: boolean
  hasCompletedNatureQuiz?: boolean
  personalityType?:       string | null
  mbtiType?:              string | null
  enneagramType?:         string | null
  humanDesignType?:       string | null
  streakCount?:           number
  lastActiveDate?:        { seconds: number } | null
  createdAt?:             { seconds: number } | null
}

type FilterTab = 'all' | 'premium' | 'free' | 'suspended'

const AVATAR_COLORS = ['#1B6B6B', '#D4933A', '#5B8DB8', '#8B6BAE', '#4CAF82', '#D95F5F']
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
}
function initials(name: string) {
  return (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}
function formatDate(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '—'
  const s = Math.floor(Date.now() / 1000) - ts.seconds
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function UsersPage() {
  const router = useRouter()
  const { ready } = useAdminAuth()

  const [users, setUsers]               = useState<User[]>([])
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [hasMore, setHasMore]           = useState(false)
  const [lastDoc, setLastDoc]           = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [search, setSearch]             = useState('')
  const [filter, setFilter]             = useState<FilterTab>('all')
  const [selected, setSelected]         = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [toast, setToast]               = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = useCallback(async (cursor?: QueryDocumentSnapshot<DocumentData>) => {
    const constraints = cursor
      ? [orderBy('createdAt', 'desc'), limit(PAGE_SIZE), startAfter(cursor)]
      : [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)]
    const snap = await getDocs(query(collection(db, 'users'), ...constraints))
    const newUsers = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User))
    setUsers((prev) => cursor ? [...prev, ...newUsers] : newUsers)
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
    setHasMore(snap.docs.length === PAGE_SIZE)
  }, [])

  useEffect(() => {
    if (ready) fetchUsers().finally(() => setLoading(false))
  }, [ready, fetchUsers])

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return
    setLoadingMore(true)
    await fetchUsers(lastDoc)
    setLoadingMore(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const filtered = useMemo(() => {
    let result = users
    if (filter === 'premium')   result = result.filter((u) => u.membershipTier === 'premium')
    else if (filter === 'free') result = result.filter((u) => u.membershipTier !== 'premium')
    else if (filter === 'suspended') result = result.filter((u) => u.suspended)
    if (search) {
      const sq = search.toLowerCase()
      result = result.filter((u) =>
        (u.displayName ?? '').toLowerCase().includes(sq) ||
        (u.email ?? '').toLowerCase().includes(sq) ||
        (u.personalityType ?? '').toLowerCase().includes(sq)
      )
    }
    return result
  }, [users, filter, search])

  const stats = useMemo(() => ({
    total:     users.length,
    premium:   users.filter((u) => u.membershipTier === 'premium').length,
    free:      users.filter((u) => u.membershipTier !== 'premium').length,
    suspended: users.filter((u) => u.suspended).length,
  }), [users])

  const syncSelected = (uid: string, patch: Partial<User>) =>
    setSelected((prev) => prev?.uid === uid ? { ...prev, ...patch } : prev)

  const handleToggleSuspend = async (user: User) => {
    setActionLoading(true)
    const suspended = !user.suspended
    await updateDoc(doc(db, 'users', user.uid), { suspended, updatedAt: serverTimestamp() })
    setUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, suspended } : u))
    syncSelected(user.uid, { suspended })
    showToast(`${user.displayName} ${suspended ? 'suspended' : 'unsuspended'}`)
    setActionLoading(false)
  }

  const handleChangeTier = async (user: User, tier: 'free' | 'premium') => {
    setActionLoading(true)
    await updateDoc(doc(db, 'users', user.uid), { membershipTier: tier, updatedAt: serverTimestamp() })
    setUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, membershipTier: tier } : u))
    syncSelected(user.uid, { membershipTier: tier })
    showToast(`${user.displayName} moved to ${tier === 'premium' ? 'Premium' : 'Free'}`)
    setActionLoading(false)
  }

  const handleDelete = async (user: User) => {
    setActionLoading(true)
    await deleteDoc(doc(db, 'users', user.uid))
    setUsers((prev) => prev.filter((u) => u.uid !== user.uid))
    setConfirmDelete(null)
    if (selected?.uid === user.uid) setSelected(null)
    showToast(`${user.displayName} deleted`)
    setActionLoading(false)
  }

  if (!ready) return null

  const TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all',       label: 'All Users',  count: stats.total },
    { id: 'premium',   label: 'Premium',    count: stats.premium },
    { id: 'free',      label: 'Free',       count: stats.free },
    { id: 'suspended', label: 'Suspended',  count: stats.suspended },
  ]

  return (
    <>
      <main className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Users</h1>
            <p className={styles.pageSub}>Manage all registered members</p>
          </div>
          <div className={styles.topbarRight}>
            <input
              className={styles.search}
              placeholder="Search name, email, personality…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className={styles.btnLogout} onClick={async () => { await signOut(auth); router.push('/login') }}>
              Sign Out
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Filter tabs */}
          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${filter === tab.id ? styles.tabActive : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
                <span className={styles.tabCount}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Skeleton loading */}
          {loading && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>User</th>
                    <th className={styles.th}>Personality</th>
                    <th className={styles.th}>Tier</th>
                    <th className={styles.th}>Streak</th>
                    <th className={styles.th}>Joined</th>
                    <th className={styles.th}>Last Active</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th} />
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className={styles.tr} style={{ cursor: 'default' }}>
                      <td className={styles.td}>
                        <div className={styles.userCell}>
                          <div className={`skeleton ${styles.skeletonCircle}`} />
                          <div>
                            <div className={`skeleton ${styles.skeletonLine}`} />
                            <div className={`skeleton ${styles.skeletonLineShort}`} />
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div className={`skeleton ${styles.skeletonLine}`} />
                        <div className={`skeleton ${styles.skeletonLineShort}`} />
                      </td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonBadge}`} /></td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonTextSm}`} /></td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonText}`} /></td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonText}`} /></td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonBadge}`} /></td>
                      <td className={styles.td} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className={styles.centeredMsg}>
              <div className={styles.emptyIcon}>👥</div>
              <div className={styles.emptyTitle}>
                {search ? `No results for "${search}"` : 'No users found'}
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && filtered.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>User</th>
                    <th className={styles.th}>Personality</th>
                    <th className={styles.th}>Tier</th>
                    <th className={styles.th}>Streak</th>
                    <th className={styles.th}>Joined</th>
                    <th className={styles.th}>Last Active</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.uid} className={styles.tr} onClick={() => setSelected(user)}>
                      <td className={styles.td}>
                        <div className={styles.userCell}>
                          <div
                            className={styles.avatar}
                            style={{ background: avatarColor(user.displayName ?? '') }}
                          >
                            {initials(user.displayName ?? '?')}
                          </div>
                          <div>
                            <div className={styles.userName}>{user.displayName}</div>
                            <div className={styles.userEmail}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        {user.personalityType ? (
                          <div>
                            <div className={styles.personality}>{user.personalityType}</div>
                            {user.mbtiType && <div className={styles.mbti}>{user.mbtiType}</div>}
                          </div>
                        ) : <span className={styles.muted}>—</span>}
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.tierBadge} ${user.membershipTier === 'premium' ? styles.premium : styles.free}`}>
                          {user.membershipTier === 'premium' ? 'Premium' : 'Free'}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.streak}>
                          {user.streakCount ? `🔥 ${user.streakCount}` : '—'}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.meta}>{formatDate(user.createdAt)}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.meta}>{timeAgo(user.lastActiveDate)}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.statusPill} ${user.suspended ? styles.statusSuspended : styles.statusActive}`}>
                          {user.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.rowActions}>
                          <button
                            className={user.suspended ? styles.btnUnsuspendSm : styles.btnSuspendSm}
                            onClick={() => handleToggleSuspend(user)}
                          >
                            {user.suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button
                            className={styles.btnDeleteSm}
                            onClick={() => setConfirmDelete(user)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More */}
          {!loading && hasMore && !search && filter === 'all' && (
            <div className={styles.loadMoreWrap}>
              <button
                className={styles.btnLoadMore}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <><span className={styles.spinnerSm} /> Loading…</>
                  : 'Load More Users'
                }
              </button>
            </div>
          )}

          {(search || filter !== 'all') && hasMore && (
            <p className={styles.searchHint}>
              Filtering within {users.length} loaded users.{' '}
              <button className={styles.btnLink} onClick={handleLoadMore}>Load more</button>{' '}
              to expand.
            </p>
          )}
        </div>
      </main>

      {/* ── Profile Drawer ──────────────────────────────────────── */}
      {selected && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setSelected(null)} />
          <aside className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div
                className={styles.drawerAvatar}
                style={{ background: avatarColor(selected.displayName ?? '') }}
              >
                {initials(selected.displayName ?? '?')}
              </div>
              <div className={styles.drawerMeta}>
                <div className={styles.drawerName}>{selected.displayName}</div>
                <div className={styles.drawerEmail}>{selected.email}</div>
                <div className={styles.drawerBadges}>
                  <span className={`${styles.tierBadge} ${selected.membershipTier === 'premium' ? styles.premium : styles.free}`}>
                    {selected.membershipTier === 'premium' ? 'Premium' : 'Free'}
                  </span>
                  <span className={`${styles.statusPill} ${selected.suspended ? styles.statusSuspended : styles.statusActive}`}>
                    {selected.suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
              </div>
              <button className={styles.drawerClose} onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Quick actions */}
            <div className={styles.drawerActions}>
              <button
                className={selected.suspended ? styles.btnUnsuspend : styles.btnSuspend}
                onClick={() => handleToggleSuspend(selected)}
                disabled={actionLoading}
              >
                {selected.suspended ? 'Unsuspend Account' : 'Suspend Account'}
              </button>
              <button
                className={styles.btnTier}
                onClick={() => handleChangeTier(selected, selected.membershipTier === 'premium' ? 'free' : 'premium')}
                disabled={actionLoading}
              >
                {selected.membershipTier === 'premium' ? 'Downgrade to Free' : 'Upgrade to Premium'}
              </button>
              <button
                className={styles.btnDeleteDrawer}
                onClick={() => setConfirmDelete(selected)}
                disabled={actionLoading}
              >
                Delete Account
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Personal info */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>Personal Info</div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Full Name</span>
                  <span className={styles.drawerVal}>{selected.displayName || '—'}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Hebrew Name</span>
                  <span className={styles.drawerVal}>{selected.hebrewName || '—'}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Mother's Name</span>
                  <span className={styles.drawerVal}>{selected.mothersName || '—'}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Phone</span>
                  <span className={styles.drawerVal}>{selected.phoneNumber || '—'}</span>
                </div>
              </div>

              {/* Personality */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>Personality Profile</div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Type</span>
                  <span className={styles.drawerVal}>{selected.personalityType || '—'}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>MBTI</span>
                  <span className={styles.drawerVal}>{selected.mbtiType || '—'}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Enneagram</span>
                  <span className={styles.drawerVal}>{selected.enneagramType || '—'}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Human Design</span>
                  <span className={styles.drawerVal}>{selected.humanDesignType || '—'}</span>
                </div>
              </div>

              {/* Account */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>Account & Activity</div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Joined</span>
                  <span className={styles.drawerVal}>{formatDate(selected.createdAt)}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Last Active</span>
                  <span className={styles.drawerVal}>{timeAgo(selected.lastActiveDate)}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Streak</span>
                  <span className={styles.drawerVal}>
                    {selected.streakCount ? `🔥 ${selected.streakCount} days` : '—'}
                  </span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Onboarding</span>
                  <span className={styles.drawerVal}>
                    {selected.hasCompletedOnboarding ? '✅ Complete' : '⏳ Incomplete'}
                  </span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerKey}>Nature Quiz</span>
                  <span className={styles.drawerVal}>
                    {selected.hasCompletedNatureQuiz ? '✅ Complete' : '⏳ Incomplete'}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── Confirm Delete ─────────────────────────────────────── */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete User</h3>
            <p className={styles.confirmMsg}>
              Permanently delete <strong>{confirmDelete.displayName}</strong>? Their profile data will be removed from Firestore. This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className={styles.btnDanger}
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  )
}
