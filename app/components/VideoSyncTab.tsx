'use client'

import { useState } from 'react'
import styles from './VideoSyncTab.module.css'

interface VideoSyncTabProps {
  showToast: (msg: string) => void
}

const syncLogs = [
  { title: 'The Path of True Teshuva', meta: 'Uploaded 3 days ago · 4 entries extracted', status: 'approved' },
  { title: 'Finding Shalom Bayis Through Inner Peace', meta: 'Uploaded 1 week ago · 6 entries extracted', status: 'approved' },
  { title: 'Anger: Understanding the Root', meta: 'Uploaded yesterday · 5 entries extracted · Awaiting review', status: 'pending' },
]

export default function VideoSyncTab({ showToast }: VideoSyncTabProps) {
  const [toggles, setToggles] = useState([true, true, true, true])

  const flip = (i: number) => {
    const next = [...toggles]
    next[i] = !next[i]
    setToggles(next)
  }

  const syncSettings = [
    { label: 'Auto-extract on new video upload', sub: 'AI reads transcript/summary when you upload and creates draft entries' },
    { label: 'Require your approval before entries go live', sub: 'Extracted entries stay as "Draft" until you review and approve them' },
    { label: 'Notify me when new entries are extracted', sub: 'Email notification when AI creates new draft entries from a video' },
    { label: 'Auto-tag topics from video metadata', sub: "Use the video's topic tags to categorize extracted teachings" },
  ]

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelTitle}>📺 Video → AI Auto-Sync</div>
            <div className={styles.panelSub}>When a new video is uploaded, the AI can automatically extract key teachings and add them to the knowledge base.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={styles.badgeGreen}>● Active</span>
            <button className={styles.btnTeal} onClick={() => {
              showToast('🔄 Manual sync started — extracting teachings from recent videos...')
              setTimeout(() => showToast('✓ Sync complete — 3 new draft entries created for your review'), 3000)
            }}>Run Sync Now</button>
          </div>
        </div>

        <div className={styles.panelBody}>
          {/* How it works */}
          <div className={styles.howItWorks}>
            <div className={styles.sectionTitle}>How Auto-Sync Works</div>
            {[
              'You upload a video through the Admin Portal',
              'You add a transcript or summary of the video\'s key teachings',
              'AI extracts the core teachings, principles, and insights automatically',
              'Entries appear in the Knowledge Base for your review — you approve or edit before they go live',
            ].map((step, i) => (
              <div key={i} className={styles.step}>
                <span className={styles.stepNum} style={{ background: i === 3 ? 'var(--gold)' : 'var(--teal)' }}>
                  {i + 1}
                </span>
                <span className={styles.stepText}>{step}</span>
              </div>
            ))}
          </div>

          {/* Sync settings */}
          <div>
            <div className={styles.sectionTitle}>Sync Settings</div>
            {syncSettings.map((s, i) => (
              <div key={i} className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <div className={styles.toggleLabel}>{s.label}</div>
                  <div className={styles.toggleSub}>{s.sub}</div>
                </div>
                <div className={`${styles.toggle} ${toggles[i] ? styles.on : ''}`} onClick={() => flip(i)} />
              </div>
            ))}
          </div>

          {/* Recent syncs */}
          <div>
            <div className={styles.sectionTitle}>Recent Video Syncs</div>
            <div className={styles.syncList}>
              {syncLogs.map((log, i) => (
                <div key={i} className={`${styles.syncItem} ${log.status === 'pending' ? styles.syncPending : ''}`}>
                  <div>
                    <div className={styles.syncTitle}>{log.title}</div>
                    <div className={styles.syncMeta}>{log.meta}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {log.status === 'approved' ? (
                      <span className={styles.badgeGreen}>✓ Approved</span>
                    ) : (
                      <>
                        <span className={styles.badgeGold}>⏳ Review</span>
                        <button className={styles.btnTeal} onClick={() => showToast('✓ Entries approved and added to AI knowledge base')}>
                          Review Now
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual upload */}
          <div>
            <div className={styles.sectionTitle}>Manually Sync a Video or Document</div>
            <div className={styles.uploadZone} onClick={() => showToast('📄 File upload — connect to Firebase Storage in production')}>
              <div className={styles.uploadIcon}>📄</div>
              <div className={styles.uploadTitle}>Upload transcript, notes, or document</div>
              <div className={styles.uploadSub}>TXT, PDF, DOCX · AI will extract teachings and create draft entries</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
