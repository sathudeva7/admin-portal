'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import Sidebar from '../components/Sidebar'
import UploadVideoModal from '../components/UploadVideoModal'
import styles from './page.module.css'

const STATS = [
  { label: 'Total Members',        value: '3,847',  delta: '+124 this week',    up: true  },
  { label: 'Active Subscribers',   value: '1,204',  delta: '+38 this week',     up: true  },
  { label: 'Donations This Month', value: '$8,340', delta: '+12% vs last month', up: true  },
  { label: 'AI Queue Pending',     value: '7',      delta: 'Needs your review', up: false },
]

const ESCALATIONS = [
  {
    id: 1,
    initials: 'YM',
    name: 'Yosef M.',
    type: 'The Seeker',
    mbti: 'INFJ',
    topic: 'Marriage',
    time: '2 hours ago',
    badge: 'Needs Guidance',
    message: '"My wife and I keep having the same argument. I want to do teshuva but she doesn\'t seem to want to change. Should I just accept things or push harder?"',
  },
  {
    id: 2,
    initials: 'SB',
    name: 'Sara B.',
    type: 'The Nurturer',
    mbti: '',
    topic: 'Parenting',
    time: '4 hours ago',
    badge: '',
    message: '"My teenage son refuses to follow the house rules and I don\'t know how to reach him anymore."',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const ready = useAdminAuth()

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [expandedId, setExpandedId]   = useState<number | null>(1)
  const [guidanceText, setGuidanceText] = useState('')
  const [notifTitle, setNotifTitle]   = useState('🔥 New Teaching from Rabbi Landau')
  const [notifMessage, setNotifMessage] = useState('A powerful new teaching is now live. Open the app to watch and begin your journey today.')
  const [sendTo, setSendTo]           = useState<'all' | 'premium' | 'custom'>('all')

  if (!ready) return null

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  return (
    <div className={styles.layout}>
      <Sidebar activeNav="Dashboard" />

      <main className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <div className={styles.topbarActions}>
            <button className={styles.btnUpload} onClick={() => setShowUploadModal(true)}>🎬 Upload Video</button>
            <button className={styles.btnNotif}>📣 Send Notification</button>
            <button className={styles.btnLive} onClick={() => router.push('/go-live')}>📺 Go Live</button>
            <button className={styles.btnLogout} onClick={handleLogout}>Sign Out</button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Stats row */}
          <div className={styles.statsRow}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={`${styles.statValue} ${!s.up ? styles.statWarn : ''}`}>
                  {s.value}
                </div>
                <div className={`${styles.statDelta} ${s.up ? styles.deltaUp : styles.deltaWarn}`}>
                  {s.up ? '↑ ' : '⚠ '}{s.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Quick action banners */}
          <div className={styles.quickActions}>
            <button className={styles.qaUpload} onClick={() => setShowUploadModal(true)}>
              <span className={styles.qaIcon}>🎬</span>
              <div>
                <div className={styles.qaTitle}>Upload New Video</div>
                <div className={styles.qaSub}>Post a new teaching</div>
              </div>
            </button>
            <button className={styles.qaNotif}>
              <span className={styles.qaIcon}>📣</span>
              <div>
                <div className={styles.qaTitle}>Send Notification</div>
                <div className={styles.qaSub}>Push to all users</div>
              </div>
            </button>
            <button className={styles.qaLive} onClick={() => router.push('/go-live')}>
              <span className={styles.qaIcon}>📺</span>
              <div>
                <div className={styles.qaTitle}>Go Live Now</div>
                <div className={styles.qaSub}>Start a live session</div>
              </div>
            </button>
          </div>

          {/* Bottom two-column section */}
          <div className={styles.twoCol}>
            {/* AI Escalation Queue */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>🤖 AI Escalation Queue</span>
                <span className={styles.pendingBadge}>7 Pending</span>
              </div>

              <div className={styles.escalationList}>
                {ESCALATIONS.map((e) => {
                  const isOpen = expandedId === e.id
                  return (
                    <div key={e.id} className={`${styles.escalationItem} ${isOpen ? styles.expanded : ''}`}>
                      <div
                        className={styles.escalationHeader}
                        onClick={() => setExpandedId(isOpen ? null : e.id)}
                      >
                        <div className={styles.avatar}>{e.initials}</div>
                        <div className={styles.escalationInfo}>
                          <div className={styles.escalationName}>
                            {e.name} — {e.type}{e.mbti ? ` · ${e.mbti}` : ''}
                          </div>
                          <div className={styles.escalationMeta}>
                            {e.topic} · Asked {e.time}
                          </div>
                        </div>
                        {isOpen
                          ? e.badge && <span className={styles.needsBadge}>{e.badge}</span>
                          : <span className={styles.expandBtn}>▼ Expand</span>
                        }
                      </div>

                      {isOpen && (
                        <div className={styles.escalationBody}>
                          <div className={styles.messageQuote}>{e.message}</div>
                          <div className={styles.guidanceLabel}>
                            Your Guidance (AI will expand &amp; personalize):
                          </div>
                          <textarea
                            className={styles.guidanceInput}
                            placeholder="Type your direction here — e.g. 'Focus on the Baal Shem Tov teaching that we can only change ourselves. Encourage patience and leading by example…'"
                            value={guidanceText}
                            onChange={(ev) => setGuidanceText(ev.target.value)}
                            rows={4}
                          />
                          <div className={styles.escalationActions}>
                            <button className={styles.btnSendAI}>Send to AI</button>
                            <button className={styles.btnSkip}>Skip</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Send Push Notification */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>📣 Send Push Notification</span>
                <span className={styles.memberCount}>3,847 members</span>
              </div>

              <div className={styles.notifForm}>
                <div className={styles.notifFormLeft}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Title</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Message</label>
                    <textarea
                      className={styles.formTextarea}
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Send To</label>
                    <div className={styles.sendToRow}>
                      {(['all', 'premium', 'custom'] as const).map((opt) => (
                        <button
                          key={opt}
                          className={`${styles.sendToBtn} ${sendTo === opt ? styles.sendToActive : ''}`}
                          onClick={() => setSendTo(opt)}
                        >
                          {opt === 'all' ? 'All Members' : opt === 'premium' ? 'Premium Only' : 'Custom'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className={styles.btnSendNotif}>
                    📣 Send to 3,847 Members
                  </button>
                </div>

                {/* Phone preview */}
                <div className={styles.notifPreview}>
                  <div className={styles.previewLabel}>Preview</div>
                  <div className={styles.phoneMock}>
                    <div className={styles.phoneAppName}>RIVNITZ</div>
                    <div className={styles.phoneNotif}>
                      <div className={styles.phoneNotifTitle}>
                        {notifTitle || 'Notification title'}
                      </div>
                      <div className={styles.phoneNotifBody}>
                        {notifMessage || 'Your message here'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {showUploadModal && (
        <UploadVideoModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  )
}
