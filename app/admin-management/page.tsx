'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import {
  initializeApp, deleteApp,
} from 'firebase/app'
import {
  getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, db, COLLECTIONS, firebaseConfig } from '../lib/firebase'
import { useAdminAuth, AdminRole } from '../lib/useAdminAuth'
import styles from './page.module.css'

interface AdminUser {
  uid:         string
  email:       string
  displayName: string
  role:        AdminRole
  createdAt:   { seconds: number } | null
  lastLoginAt: { seconds: number } | null
}

const ROLE_OPTIONS: { value: AdminRole; label: string; desc: string }[] = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Full access to all features and admin management' },
  { value: 'rabbi',       label: 'Rabbi',       desc: 'Can go live, upload videos, and manage AI content' },
  { value: 'moderator',   label: 'Moderator',   desc: 'Can manage community posts and notifications' },
]

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: '#1B6B6B',
  rabbi:       '#7B5EA7',
  moderator:   '#D4933A',
}

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function AdminManagementPage() {
  const router = useRouter()
  const { ready, role, uid: currentUid } = useAdminAuth()

  const [admins, setAdmins]           = useState<AdminUser[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)

  // New admin form state
  const [newName, setNewName]         = useState('')
  const [newEmail, setNewEmail]       = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole]         = useState<AdminRole>('moderator')
  const [formError, setFormError]     = useState('')

  const isSuperAdmin = role === 'super_admin'

  // Redirect non-super-admins away
  useEffect(() => {
    if (ready && !isSuperAdmin) router.replace('/dashboard')
  }, [ready, isSuperAdmin, router])

  const fetchAdmins = async () => {
    const snap = await getDocs(collection(db, COLLECTIONS.ADMINS))
    setAdmins(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AdminUser)))
    setLoading(false)
  }

  useEffect(() => {
    if (ready && isSuperAdmin) fetchAdmins()
  }, [ready, isSuperAdmin])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Add new admin ─────────────────────────────────────────────
  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }

    setSaving(true)
    // Use a secondary Firebase app so creating the new user
    // doesn't sign out the current super admin session
    const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`)
    try {
      const secondaryAuth = getAuth(secondaryApp)
      const { user } = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword)
      await firebaseSignOut(secondaryAuth)

      await setDoc(doc(db, COLLECTIONS.ADMINS, user.uid), {
        uid:         user.uid,
        email:       newEmail,
        displayName: newName,
        role:        newRole,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
        lastLoginAt: null,
      })

      setShowModal(false)
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('moderator')
      await fetchAdmins()
      showToast(`${newName} added as ${ROLE_OPTIONS.find(r => r.value === newRole)?.label}`)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        setFormError('An account with this email already exists.')
      } else if (code === 'auth/invalid-email') {
        setFormError('Please enter a valid email address.')
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      await deleteApp(secondaryApp)
      setSaving(false)
    }
  }

  // ── Change role ───────────────────────────────────────────────
  const handleRoleChange = async (admin: AdminUser, newRoleValue: AdminRole) => {
    await updateDoc(doc(db, COLLECTIONS.ADMINS, admin.uid), {
      role:      newRoleValue,
      updatedAt: serverTimestamp(),
    })
    setAdmins((prev) =>
      prev.map((a) => a.uid === admin.uid ? { ...a, role: newRoleValue } : a)
    )
    showToast(`${admin.displayName}'s role updated to ${ROLE_OPTIONS.find(r => r.value === newRoleValue)?.label}`)
  }

  // ── Remove admin ──────────────────────────────────────────────
  const handleRemove = async (admin: AdminUser) => {
    await deleteDoc(doc(db, COLLECTIONS.ADMINS, admin.uid))
    setAdmins((prev) => prev.filter((a) => a.uid !== admin.uid))
    setConfirmDelete(null)
    showToast(`${admin.displayName} removed`)
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  if (!ready || !isSuperAdmin) return null

  return (
    <>
      <main className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Admin Management</h1>
            <p className={styles.pageSub}>Manage admin accounts and permission levels</p>
          </div>
          <div className={styles.topbarRight}>
            <button className={styles.btnAdd} onClick={() => { setFormError(''); setShowModal(true) }}>
              + Add Admin
            </button>
            <button className={styles.btnLogout} onClick={handleLogout}>Sign Out</button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Role legend */}
          <div className={styles.roleLegend}>
            {ROLE_OPTIONS.map((r) => (
              <div key={r.value} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: ROLE_COLORS[r.value] }} />
                <div>
                  <span className={styles.legendLabel}>{r.label}</span>
                  <span className={styles.legendDesc}>{r.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Admin table */}
          {loading ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Name</th>
                    <th className={styles.th}>Email</th>
                    <th className={styles.th}>Role</th>
                    <th className={styles.th}>Added</th>
                    <th className={styles.th}>Last Login</th>
                    <th className={styles.th} />
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.nameCell}>
                          <div className={`skeleton ${styles.skeletonAvatar}`} />
                          <div className={`skeleton ${styles.skeletonName}`} />
                        </div>
                      </td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonEmail}`} /></td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonRole}`} /></td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonDate}`} /></td>
                      <td className={styles.td}><div className={`skeleton ${styles.skeletonDate}`} /></td>
                      <td className={styles.td} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Name</th>
                    <th className={styles.th}>Email</th>
                    <th className={styles.th}>Role</th>
                    <th className={styles.th}>Added</th>
                    <th className={styles.th}>Last Login</th>
                    <th className={styles.th} />
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => {
                    const isSelf = admin.uid === currentUid
                    return (
                      <tr key={admin.uid} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.nameCell}>
                            <div
                              className={styles.avatar}
                              style={{ background: ROLE_COLORS[admin.role] }}
                            >
                              {admin.displayName?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <span className={styles.adminName}>
                              {admin.displayName}
                              {isSelf && <span className={styles.youBadge}>You</span>}
                            </span>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.email}>{admin.email}</span>
                        </td>
                        <td className={styles.td}>
                          {isSelf ? (
                            <span
                              className={styles.rolePill}
                              style={{ background: ROLE_COLORS[admin.role] + '22', color: ROLE_COLORS[admin.role] }}
                            >
                              {ROLE_OPTIONS.find((r) => r.value === admin.role)?.label}
                            </span>
                          ) : (
                            <select
                              className={styles.roleSelect}
                              value={admin.role}
                              onChange={(e) => handleRoleChange(admin, e.target.value as AdminRole)}
                              style={{ borderColor: ROLE_COLORS[admin.role] + '66', color: ROLE_COLORS[admin.role] }}
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className={styles.td}>
                          <span className={styles.meta}>{formatDate(admin.createdAt)}</span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.meta}>{formatDate(admin.lastLoginAt)}</span>
                        </td>
                        <td className={styles.td}>
                          {!isSelf && (
                            <button
                              className={styles.btnRemove}
                              onClick={() => setConfirmDelete(admin)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Add Admin Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Admin</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddAdmin} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Rabbi Cohen"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="e.g. rabbi@rivnitz.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Temporary Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Role</label>
                <div className={styles.roleCards}>
                  {ROLE_OPTIONS.map((r) => (
                    <label
                      key={r.value}
                      className={`${styles.roleCard} ${newRole === r.value ? styles.roleCardActive : ''}`}
                      style={newRole === r.value ? { borderColor: ROLE_COLORS[r.value], background: ROLE_COLORS[r.value] + '11' } : {}}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={newRole === r.value}
                        onChange={() => setNewRole(r.value)}
                        className={styles.radioHidden}
                      />
                      <div className={styles.roleCardTop}>
                        <span
                          className={styles.roleCardDot}
                          style={{ background: ROLE_COLORS[r.value] }}
                        />
                        <span className={styles.roleCardLabel} style={newRole === r.value ? { color: ROLE_COLORS[r.value] } : {}}>
                          {r.label}
                        </span>
                      </div>
                      <p className={styles.roleCardDesc}>{r.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {formError && <p className={styles.error}>{formError}</p>}

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnSave} disabled={saving}>
                  {saving ? 'Creating…' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ────────────────────────────────── */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Remove Admin</h3>
            <p className={styles.confirmMsg}>
              Remove <strong>{confirmDelete.displayName}</strong> from the admin panel?
              They will no longer be able to log in.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={() => handleRemove(confirmDelete)}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  )
}
