'use client'

import { useRef, useState, useCallback, DragEvent } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import styles from './UploadVideoModal.module.css'

interface Props {
  onClose: () => void
  onSuccess?: () => void
}

type Stage = 'drop' | 'uploading' | 'processing' | 'form' | 'saving' | 'done' | 'error'

export default function UploadVideoModal({ onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [stage, setStage]               = useState<Stage>('drop')
  const [dragging, setDragging]         = useState(false)
  const [progress, setProgress]         = useState(0)
  const [assetId, setAssetId]           = useState<string | null>(null)
  const [playbackId, setPlaybackId]     = useState<string | null>(null)
  const [muxDuration, setMuxDuration]   = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [topicInput, setTopicInput]     = useState('')
  const [topics, setTopics]             = useState<string[]>([])
  const [publishMode, setPublishMode]   = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt]   = useState('')

  const pollUntilReady = useCallback((uid: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const res  = await fetch(`/api/mux-asset?uploadId=${uid}`)
          const data = await res.json()

          if (data.status === 'ready') {
            setAssetId(data.assetId)
            setPlaybackId(data.playbackId)
            setMuxDuration(data.duration)
            setStage('form')
            resolve()
          } else if (data.status === 'errored') {
            reject(new Error('Mux asset processing failed'))
          } else {
            pollRef.current = setTimeout(poll, 2500)
          }
        } catch (err) {
          reject(err)
        }
      }
      poll()
    })
  }, [])

  const handleFileChosen = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file.')
      setStage('error')
      return
    }

    try {
      const res = await fetch('/api/mux-upload', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create upload URL')
      const { uploadId, uploadUrl } = await res.json()

      setStage('uploading')
      setProgress(0)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.open('PUT', uploadUrl)
        xhr.send(file)
      })

      setStage('processing')
      await pollUntilReady(uploadId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStage('error')
    }
  }, [pollUntilReady])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileChosen(file)
  }, [handleFileChosen])

  const addTopic = () => {
    const t = topicInput.trim()
    if (t && !topics.includes(t)) setTopics((prev) => [...prev, t])
    setTopicInput('')
  }

  const removeTopic = (t: string) => setTopics((prev) => prev.filter((x) => x !== t))

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!playbackId)   { setError('Missing playback ID — please try again'); return }
    if (publishMode === 'schedule' && !scheduledAt) { setError('Please select a scheduled date/time'); return }
    setError(null)
    setStage('saving')
    try {
      const postedDate = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })

      const basePayload = {
        title:         title.trim(),
        description:   description.trim(),
        topics,
        muxPlaybackId: playbackId,
        muxAssetId:    assetId,
        duration:      muxDuration ?? '',
        viewCount:     0,
        postedDate,
        createdAt:     serverTimestamp(),
      }

      if (publishMode === 'now') {
        await addDoc(collection(db, 'videos'), {
          ...basePayload,
          publishStatus: 'published',
          isNew:         true,
          publishedAt:   serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'videos'), {
          ...basePayload,
          publishStatus:        'scheduled',
          isNew:                false,
          scheduledPublishAt:   scheduledAt,
          publishedAt:          null,
        })
      }

      setStage('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save video')
      setStage('form')
    }
  }

  const handleClose = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <button className={styles.closeBtn} onClick={handleClose}>✕</button>

        <div className={styles.header}>
          <span className={styles.headerIcon}>🎬</span>
          <div>
            <div className={styles.title}>Upload New Video</div>
            <div className={styles.subtitle}>Upload a teaching to Mux and publish to the app</div>
          </div>
        </div>

        {/* ── Drop zone ── */}
        {stage === 'drop' && (
          <div
            className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className={styles.hidden}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChosen(f) }}
            />
            <div className={styles.dropIcon}>📁</div>
            <div className={styles.dropTitle}>Drag & drop your video here</div>
            <div className={styles.dropSub}>or click to browse — MP4, MOV, MKV supported</div>
          </div>
        )}

        {/* ── Uploading ── */}
        {stage === 'uploading' && (
          <div className={styles.centeredPane}>
            <div className={styles.paneTitle}>Uploading to Mux…</div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.progressLabel}>{progress}%</div>
          </div>
        )}

        {/* ── Processing ── */}
        {stage === 'processing' && (
          <div className={styles.centeredPane}>
            <div className={styles.spinner} />
            <div className={styles.paneTitle}>Processing your video…</div>
            <div className={styles.paneSub}>Mux is encoding your file. This usually takes under a minute.</div>
          </div>
        )}

        {/* ── Metadata form ── */}
        {(stage === 'form' || stage === 'saving') && (
          <div className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>Title *</label>
              <input
                className={styles.input}
                placeholder="e.g. The Power of Teshuvah – Part 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Brief description of this teaching…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Topics / Tags</label>
              <div className={styles.tagInputRow}>
                <input
                  className={styles.input}
                  placeholder="Add a topic and press Enter"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }}
                />
                <button type="button" className={styles.addTagBtn} onClick={addTopic}>Add</button>
              </div>
              {topics.length > 0 && (
                <div className={styles.tagList}>
                  {topics.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                      <button type="button" onClick={() => removeTopic(t)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── When to Publish? ── */}
            <div className={styles.formRow}>
              <label className={styles.label}>When to Publish?</label>
              <div className={styles.publishToggle}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${publishMode === 'now' ? styles.toggleActive : ''}`}
                  onClick={() => setPublishMode('now')}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${publishMode === 'schedule' ? styles.toggleActive : ''}`}
                  onClick={() => setPublishMode('schedule')}
                >
                  Schedule
                </button>
              </div>
              {publishMode === 'schedule' && (
                <input
                  type="datetime-local"
                  className={styles.input}
                  style={{ marginTop: 8 }}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              )}
            </div>

            {muxDuration && (
              <div className={styles.formRow}>
                <label className={styles.label}>Duration (from Mux)</label>
                <div className={styles.durationBadge}>{muxDuration}</div>
              </div>
            )}

            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
              <button
                className={styles.publishBtn}
                onClick={handleSave}
                disabled={stage === 'saving'}
              >
                {stage === 'saving'
                  ? 'Saving…'
                  : publishMode === 'schedule' ? '⏰ Schedule Video' : '🚀 Publish Video'
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {stage === 'done' && (
          <div className={styles.centeredPane}>
            <div className={styles.resultIcon}>{publishMode === 'schedule' ? '⏰' : '✅'}</div>
            <div className={styles.paneTitle}>
              {publishMode === 'schedule' ? 'Video Scheduled!' : 'Video Published!'}
            </div>
            <div className={styles.paneSub}>
              {publishMode === 'schedule' && scheduledAt
                ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}`
                : 'Your teaching is now live in the Rivnitz app.'
              }
            </div>
            <button className={styles.publishBtn} onClick={() => { onSuccess?.(); handleClose() }}>
              Close
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {stage === 'error' && (
          <div className={styles.centeredPane}>
            <div className={styles.resultIcon}>❌</div>
            <div className={styles.paneTitle}>Something went wrong</div>
            <div className={styles.paneSub}>{error}</div>
            <button className={styles.publishBtn} onClick={() => { setError(null); setStage('drop') }}>
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
