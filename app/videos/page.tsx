'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import Sidebar from '../components/Sidebar'
import UploadVideoModal from '../components/UploadVideoModal'
import VideoPlayerModal from '../components/VideoPlayerModal'
import styles from './page.module.css'

export interface Video {
  id: string
  title: string
  description?: string
  topics?: string[]
  muxPlaybackId: string
  muxAssetId?: string
  duration?: string
  viewCount?: number
  postedDate?: string
  isNew?: boolean
}

export default function VideosPage() {
  const ready = useAdminAuth()

  const [videos, setVideos]             = useState<Video[]>([])
  const [loading, setLoading]           = useState(true)
  const [showUpload, setShowUpload]     = useState(false)
  const [selected, setSelected]         = useState<Video | null>(null)
  const [search, setSearch]             = useState('')

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Video)))
      setLoading(false)
    })
    return unsub
  }, [])

  if (!ready) return null

  const q = search.toLowerCase()
  const filtered = videos.filter((v) =>
    (v.title ?? '').toLowerCase().includes(q) ||
    v.topics?.some((t) => (t ?? '').toLowerCase().includes(q))
  )

  return (
    <div className={styles.layout}>
      <Sidebar activeNav="Videos" />

      <main className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <h1 className={styles.pageTitle}>Videos</h1>
          <div className={styles.topbarRight}>
            <input
              className={styles.search}
              placeholder="Search videos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className={styles.btnUpload} onClick={() => setShowUpload(true)}>
              🎬 Upload New Video
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Stats bar */}
          {!loading && (
            <div className={styles.statsBar}>
              <span className={styles.statItem}>
                <strong>{videos.length}</strong> total videos
              </span>
              <span className={styles.statItem}>
                <strong>{videos.filter((v) => v.isNew).length}</strong> new
              </span>
              <span className={styles.statItem}>
                <strong>{videos.reduce((s, v) => s + (v.viewCount ?? 0), 0).toLocaleString()}</strong> total views
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={styles.centeredMsg}>
              <div className={styles.spinner} />
              <span>Loading videos…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && videos.length === 0 && (
            <div className={styles.centeredMsg}>
              <div className={styles.emptyIcon}>📹</div>
              <div className={styles.emptyTitle}>No videos yet</div>
              <div className={styles.emptySub}>Upload your first teaching to get started.</div>
              <button className={styles.btnUpload} onClick={() => setShowUpload(true)}>
                🎬 Upload First Video
              </button>
            </div>
          )}

          {/* No search results */}
          {!loading && videos.length > 0 && filtered.length === 0 && (
            <div className={styles.centeredMsg}>
              <div className={styles.emptyIcon}>🔍</div>
              <div className={styles.emptyTitle}>No results for &quot;{search}&quot;</div>
            </div>
          )}

          {/* Video grid */}
          {!loading && filtered.length > 0 && (
            <div className={styles.grid}>
              {filtered.map((v) => (
                <div key={v.id} className={styles.card} onClick={() => setSelected(v)}>
                  <div className={styles.thumb}>
                    <img
                      src={`https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?width=640&time=0`}
                      alt={v.title}
                      className={styles.thumbImg}
                    />
                    <div className={styles.playOverlay}>
                      <div className={styles.playBtn}>▶</div>
                    </div>
                    {v.duration && (
                      <span className={styles.duration}>{v.duration}</span>
                    )}
                    {v.isNew && (
                      <span className={styles.newBadge}>NEW</span>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.videoTitle}>{v.title ?? 'Untitled'}</div>
                    <div className={styles.videoMeta}>
                      {v.postedDate && <span>{v.postedDate}</span>}
                      {v.viewCount !== undefined && (
                        <span>{v.viewCount.toLocaleString()} views</span>
                      )}
                    </div>
                    {v.topics && v.topics.length > 0 && (
                      <div className={styles.tagList}>
                        {v.topics.slice(0, 3).map((t) => (
                          <span key={t} className={styles.tag}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showUpload && (
        <UploadVideoModal onClose={() => setShowUpload(false)} />
      )}

      {selected && (
        <VideoPlayerModal video={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
