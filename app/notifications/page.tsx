'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import {
  collection, query, orderBy, limit, getDocs,
  Timestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import styles from './page.module.css'

type Audience = 'all' | 'premium'

interface NotifRecord {
  id:             string
  title:          string
  body:           string
  targetAudience: Audience
  sentBy:         string
  sentCount:      number
  sentAt:         Timestamp | null
}

function formatTs(ts: Timestamp | null): string {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const AUDIENCE_OPTIONS: { value: Audience; label: string; desc: string }[] = [
  { value: 'all',     label: 'All Members',    desc: 'Send to every user with push enabled' },
  { value: 'premium', label: 'Premium Only',   desc: 'Send to paid subscribers only' },
]

export default function NotificationsPage() {
  const router = useRouter()
  const { ready, displayName } = useAdminAuth()

  // Compose form
  const [title,    setTitle]    = useState('🔥 Message from Rabbi Landau')
  const [body,     setBody]     = useState('')
  const [audience, setAudience] = useState<Audience>('all')

  // UI state
  const [sending,     setSending]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  // History
  const [history,      setHistory]      = useState<NotifRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (!ready) return
    loadHistory()
  }, [ready])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, 'notifications'),
          orderBy('sentAt', 'desc'),
          limit(20),
        ),
      )
      setHistory(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as NotifRecord)),
      )
    } catch {
      // Notifications collection may not exist yet — that's fine
    } finally {
      setLoadingHistory(false)
    }
  }

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSend = async () => {
    setShowConfirm(false)
    setSending(true)
    try {
      const res  = await fetch('/api/send-notification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:          title.trim(),
          body:           body.trim(),
          targetAudience: audience,
          sentBy:         displayName ?? 'Admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')

      showToast(
        data.sent === 0
          ? 'No registered devices found'
          : `Sent to ${data.sent} device${data.sent === 1 ? '' : 's'}`,
        data.sent > 0,
      )
      // Refresh history
      await loadHistory()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      showToast(msg, false)
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending

  if (!ready) return null

  return (
    <>
      <main className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Push Notifications</h1>
            <p className={styles.pageSub}>Send announcements and updates directly to members&apos; devices</p>
          </div>
          <button className={styles.btnLogout} onClick={handleLogout}>Sign Out</button>
        </div>

        <div className={styles.content}>
          {/* Compose + Preview row */}
          <div className={styles.composeRow}>
            {/* Compose Panel */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>📣 Compose Notification</span>
              </div>

              {/* Title */}
              <div className={styles.field}>
                <label className={styles.label}>Title</label>
                <input
                  className={styles.input}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 🔥 New Teaching from Rabbi Landau"
                  maxLength={100}
                />
                <span className={styles.charCount}>{title.length}/100</span>
              </div>

              {/* Body */}
              <div className={styles.field}>
                <label className={styles.label}>Message</label>
                <textarea
                  className={styles.textarea}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your message here — keep it clear and compelling. Members will see this in their notification tray."
                  rows={5}
                  maxLength={300}
                />
                <span className={styles.charCount}>{body.length}/300</span>
              </div>

              {/* Audience */}
              <div className={styles.field}>
                <label className={styles.label}>Send To</label>
                <div className={styles.audienceRow}>
                  {AUDIENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`${styles.audienceBtn} ${audience === opt.value ? styles.audienceBtnActive : ''}`}
                      onClick={() => setAudience(opt.value)}
                    >
                      <span className={styles.audienceBtnLabel}>{opt.label}</span>
                      <span className={styles.audienceBtnDesc}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={styles.btnSend}
                disabled={!canSend}
                onClick={() => setShowConfirm(true)}
              >
                {sending ? 'Sending…' : `📣 Send to ${audience === 'all' ? 'All Members' : 'Premium Members'}`}
              </button>
            </div>

            {/* Phone Preview */}
            <div className={styles.previewPanel}>
              <div className={styles.previewLabel}>Live Preview</div>
              <div className={styles.phoneMock}>
                <div className={styles.phoneBar} />
                <div className={styles.phoneScreen}>
                  <div className={styles.phoneStatusRow}>
                    <span className={styles.phoneTime}>9:41</span>
                  </div>
                  <div className={styles.phoneNotif}>
                    <div className={styles.phoneNotifHeader}>
                      <div className={styles.phoneAppIcon}>🔥</div>
                      <span className={styles.phoneAppName}>RIVNITZ</span>
                      <span className={styles.phoneNotifTime}>now</span>
                    </div>
                    <div className={styles.phoneNotifTitle}>
                      {title || 'Notification title'}
                    </div>
                    <div className={styles.phoneNotifBody}>
                      {body || 'Your message will appear here…'}
                    </div>
                  </div>
                </div>
              </div>
              <p className={styles.previewHint}>
                This is how members will see your notification on their lock screen.
              </p>
            </div>
          </div>

          {/* Send History */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>📋 Send History</span>
              <span className={styles.historyNote}>Last 20 notifications</span>
            </div>

            {loadingHistory ? (
              <div className={styles.skeletonList}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <div className={`skeleton ${styles.skeletonTitle}`} />
                    <div className={`skeleton ${styles.skeletonMeta}`} />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📭</span>
                <p className={styles.emptyText}>No notifications sent yet.</p>
                <p className={styles.emptyHint}>Your send history will appear here after the first notification.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Title</th>
                        <th className={styles.th}>Message</th>
                        <th className={styles.th}>Audience</th>
                        <th className={styles.th}>Sent By</th>
                        <th className={styles.th}>Devices</th>
                        <th className={styles.th}>Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(n => (
                        <tr key={n.id} className={styles.tr}>
                          <td className={styles.td}>
                            <span className={styles.histTitle}>{n.title}</span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.histBody}>{n.body}</span>
                          </td>
                          <td className={styles.td}>
                            <span className={`${styles.audiencePill} ${n.targetAudience === 'premium' ? styles.audiencePremium : styles.audienceAll}`}>
                              {n.targetAudience === 'premium' ? 'Premium' : 'All'}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.meta}>{n.sentBy}</span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.sentCount}>{n.sentCount}</span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.meta}>{formatTs(n.sentAt)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className={styles.mobileCardList}>
                  {history.map(n => (
                    <div key={n.id} className={styles.histCard}>
                      <div className={styles.histCardTop}>
                        <span className={`${styles.audiencePill} ${n.targetAudience === 'premium' ? styles.audiencePremium : styles.audienceAll}`}>
                          {n.targetAudience === 'premium' ? 'Premium' : 'All'}
                        </span>
                        <span className={styles.meta}>{formatTs(n.sentAt)}</span>
                      </div>
                      <div className={styles.histTitle}>{n.title}</div>
                      <div className={styles.histBody}>{n.body}</div>
                      <div className={styles.histCardMeta}>
                        <span className={styles.meta}>By {n.sentBy}</span>
                        <span className={styles.sentCount}>{n.sentCount} devices</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Confirm Send Modal ──────────────────────────────────── */}
      {showConfirm && (
        <div className={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>📣</div>
            <h2 className={styles.modalTitle}>Send Notification?</h2>
            <p className={styles.modalMsg}>
              This will deliver a push notification to{' '}
              <strong>{audience === 'all' ? 'all members' : 'premium members'}</strong>{' '}
              who have notifications enabled.
            </p>
            <div className={styles.modalPreview}>
              <div className={styles.modalPreviewTitle}>{title}</div>
              <div className={styles.modalPreviewBody}>{body}</div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className={styles.btnConfirm} onClick={handleSend}>
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}
    </>
  )
}
