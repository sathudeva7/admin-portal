'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Video } from '../videos/page'
import styles from './VideoPlayerModal.module.css'

// Mux player is browser-only — load it client-side only
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false })

interface Props {
  video: Video
  onClose: () => void
  onDelete: () => void
  onSave: (updated: Video) => void
  initialEditMode?: boolean
}

export default function VideoPlayerModal({ video, onClose, onDelete, onSave, initialEditMode = false }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialEditMode ? 'edit' : 'view')

  // Edit form state
  const [editTitle, setEditTitle]               = useState(video.title)
  const [editDescription, setEditDescription]   = useState(video.description ?? '')
  const [editTopics, setEditTopics]             = useState<string[]>(video.topics ?? [])
  const [editTopicInput, setEditTopicInput]     = useState('')
  const [editPublishStatus, setEditPublishStatus] = useState<'published' | 'scheduled'>(
    video.publishStatus ?? 'published'
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Reset form state when video changes
  useEffect(() => {
    setMode(initialEditMode ? 'edit' : 'view')
    setEditTitle(video.title)
    setEditDescription(video.description ?? '')
    setEditTopics(video.topics ?? [])
    setEditTopicInput('')
    setEditPublishStatus(video.publishStatus ?? 'published')
    setSaveError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id])

  const addEditTopic = () => {
    const t = editTopicInput.trim()
    if (t && !editTopics.includes(t)) setEditTopics((prev) => [...prev, t])
    setEditTopicInput('')
  }

  const removeEditTopic = (t: string) => setEditTopics((prev) => prev.filter((x) => x !== t))

  const handleSave = async () => {
    if (!editTitle.trim()) { setSaveError('Title is required'); return }
    setSaveError(null)
    setSaving(true)
    try {
      await updateDoc(doc(db, 'videos', video.id), {
        title:         editTitle.trim(),
        description:   editDescription.trim(),
        topics:        editTopics,
        publishStatus: editPublishStatus,
        updatedAt:     serverTimestamp(),
      })
      const updated: Video = {
        ...video,
        title:         editTitle.trim(),
        description:   editDescription.trim(),
        topics:        editTopics,
        publishStatus: editPublishStatus,
      }
      onSave(updated)
      setMode('view')
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Analytics helpers
  const statusLabel =
    video.publishStatus === 'scheduled' ? 'Scheduled'
    : video.publishStatus === 'published' ? 'Published'
    : 'Published'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {/* ─── VIEW MODE ─────────────────────────────────────────── */}
        {mode === 'view' && (
          <>
            {/* Player */}
            <div className={styles.playerWrap}>
              <MuxPlayer
                playbackId={video.muxPlaybackId}
                metadata={{ video_title: video.title }}
                accentColor="#1B6B6B"
                style={{ width: '100%', aspectRatio: '16/9', display: 'block' }}
              />
            </div>

            {/* Details */}
            <div className={styles.details}>
              <div className={styles.titleRow}>
                <div className={styles.title}>{video.title}</div>
                {video.isNew && <span className={styles.newBadge}>NEW</span>}
              </div>

              <div className={styles.meta}>
                {video.postedDate && <span>{video.postedDate}</span>}
                {video.duration   && <span>· {video.duration}</span>}
                {video.viewCount !== undefined && (
                  <span>· {video.viewCount.toLocaleString()} views</span>
                )}
              </div>

              {video.description && (
                <p className={styles.description}>{video.description}</p>
              )}

              {video.topics && video.topics.length > 0 && (
                <div className={styles.tagList}>
                  {video.topics.map((t) => (
                    <span key={t} className={styles.tag}>{t}</span>
                  ))}
                </div>
              )}

              {/* Analytics */}
              <div className={styles.analyticsSection}>
                <div className={styles.analyticsLabel}>📊 Analytics</div>
                <div className={styles.analyticsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{video.viewCount?.toLocaleString() ?? '0'}</div>
                    <div className={styles.statMeta}>Total Views</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{video.duration ?? '—'}</div>
                    <div className={styles.statMeta}>Duration</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{statusLabel}</div>
                    <div className={styles.statMeta}>Status</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{video.topics?.length ?? 0}</div>
                    <div className={styles.statMeta}>Topics</div>
                  </div>
                </div>
                {video.publishStatus === 'scheduled' && video.scheduledPublishAt && (
                  <div className={styles.scheduledNote}>
                    ⏰ Scheduled to publish on {new Date(video.scheduledPublishAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Action row */}
              <div className={styles.actionRow}>
                <button className={styles.btnEdit} onClick={() => setMode('edit')}>✏️ Edit Video</button>
                <button className={styles.btnDelete} onClick={onDelete}>🗑️ Delete</button>
              </div>
            </div>
          </>
        )}

        {/* ─── EDIT MODE ─────────────────────────────────────────── */}
        {mode === 'edit' && (
          <div className={styles.editForm}>
            <div className={styles.editFormTitle}>Edit Video</div>

            <div className={styles.editFormRow}>
              <label className={styles.editLabel}>Title *</label>
              <input
                className={styles.editInput}
                placeholder="Video title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className={styles.editFormRow}>
              <label className={styles.editLabel}>Description</label>
              <textarea
                className={styles.editTextarea}
                rows={3}
                placeholder="Brief description of this teaching…"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className={styles.editFormRow}>
              <label className={styles.editLabel}>Topics / Tags</label>
              <div className={styles.editTagInputRow}>
                <input
                  className={styles.editInput}
                  placeholder="Add a topic and press Enter"
                  value={editTopicInput}
                  onChange={(e) => setEditTopicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEditTopic() } }}
                />
                <button type="button" className={styles.editAddTagBtn} onClick={addEditTopic}>Add</button>
              </div>
              {editTopics.length > 0 && (
                <div className={styles.editTagList}>
                  {editTopics.map((t) => (
                    <span key={t} className={styles.editTag}>
                      {t}
                      <button type="button" onClick={() => removeEditTopic(t)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Publish status */}
            <div className={styles.editFormRow}>
              <label className={styles.editLabel}>Publish Status</label>
              <div className={styles.editStatusRow}>
                <button
                  type="button"
                  className={`${styles.editStatusBtn} ${editPublishStatus === 'published' ? styles.editStatusActive : ''}`}
                  onClick={() => setEditPublishStatus('published')}
                >
                  ✅ Published
                </button>
                <button
                  type="button"
                  className={`${styles.editStatusBtn} ${editPublishStatus === 'scheduled' ? styles.editStatusActive : ''}`}
                  onClick={() => setEditPublishStatus('scheduled')}
                >
                  ⏰ Scheduled
                </button>
              </div>
            </div>

            {saveError && (
              <div className={styles.editErrorMsg}>{saveError}</div>
            )}

            <div className={styles.editActions}>
              <button className={styles.editCancelBtn} onClick={() => { setSaveError(null); setMode('view') }}>
                Cancel
              </button>
              <button className={styles.editSaveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
