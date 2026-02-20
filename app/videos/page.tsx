'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  collection, getDocs, orderBy, query,
  limit, startAfter, QueryDocumentSnapshot, DocumentData,
  deleteDoc, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import UploadVideoModal from '../components/UploadVideoModal'
import VideoPlayerModal from '../components/VideoPlayerModal'
import Image from 'next/image'
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
  publishStatus?: 'published' | 'scheduled'
  scheduledPublishAt?: string | null
}

const PAGE_SIZE = 12

export default function VideosPage() {
  const { ready } = useAdminAuth()

  const [videos, setVideos]           = useState<Video[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(false)
  const [lastDoc, setLastDoc]         = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [showUpload, setShowUpload]   = useState(false)
  const [selected, setSelected]       = useState<Video | null>(null)
  const [search, setSearch]           = useState('')
  const [editMode, setEditMode]       = useState(false)
  const [deleteVideo, setDeleteVideo] = useState<Video | null>(null)

  const fetchVideos = useCallback(async (cursor?: QueryDocumentSnapshot<DocumentData>) => {
    const constraints = cursor
      ? [orderBy('createdAt', 'desc'), limit(PAGE_SIZE), startAfter(cursor)]
      : [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)]
    const snap = await getDocs(query(collection(db, 'videos'), ...constraints))
    const newVideos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Video))

    // Auto-publish any scheduled videos whose time has passed
    const now = new Date()
    const overdue = newVideos.filter(
      (v) => v.publishStatus === 'scheduled' && v.scheduledPublishAt && new Date(v.scheduledPublishAt) <= now
    )
    if (overdue.length > 0) {
      await Promise.all(
        overdue.map((v) =>
          updateDoc(doc(db, 'videos', v.id), {
            publishStatus: 'published',
            isNew: true,
            publishedAt: serverTimestamp(),
          })
        )
      )
      overdue.forEach((v) => {
        v.publishStatus = 'published'
        v.isNew = true
      })
    }

    setVideos((prev) => cursor ? [...prev, ...newVideos] : newVideos)
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
    setHasMore(snap.docs.length === PAGE_SIZE)
  }, [])

  useEffect(() => {
    fetchVideos().finally(() => setLoading(false))
  }, [fetchVideos])

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return
    setLoadingMore(true)
    await fetchVideos(lastDoc)
    setLoadingMore(false)
  }

  const handleUploadClose = () => {
    setShowUpload(false)
    setLoading(true)
    setLastDoc(null)
    fetchVideos().finally(() => setLoading(false))
  }

  const handleEditSave = (updated: Video) => {
    setVideos((prev) => prev.map((v) => v.id === updated.id ? updated : v))
    setSelected(updated)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteVideo) return
    try {
      await deleteDoc(doc(db, 'videos', deleteVideo.id))
      setVideos((prev) => prev.filter((v) => v.id !== deleteVideo.id))
      if (selected?.id === deleteVideo.id) setSelected(null)
    } finally {
      setDeleteVideo(null)
    }
  }

  if (!ready) return null

  const sq = search.toLowerCase()
  const filtered = search
    ? videos.filter((v) =>
        (v.title ?? '').toLowerCase().includes(sq) ||
        v.topics?.some((t) => (t ?? '').toLowerCase().includes(sq))
      )
    : videos

  return (
    <>
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
                <strong>{videos.length}</strong> loaded videos
              </span>
              <span className={styles.statItem}>
                <strong>{videos.filter((v) => v.isNew).length}</strong> new
              </span>
              <span className={styles.statItem}>
                <strong>{videos.filter((v) => v.publishStatus === 'scheduled').length}</strong> scheduled
              </span>
              <span className={styles.statItem}>
                <strong>{videos.reduce((s, v) => s + (v.viewCount ?? 0), 0).toLocaleString()}</strong> total views
              </span>
            </div>
          )}

          {/* Skeleton loading */}
          {loading && (
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={`skeleton ${styles.skeletonThumb}`} />
                  <div className={styles.skeletonCardBody}>
                    <div className={`skeleton ${styles.skeletonLine}`} />
                    <div className={`skeleton ${styles.skeletonLineMed}`} />
                    <div className={styles.skeletonTags}>
                      <div className={`skeleton ${styles.skeletonTag}`} />
                      <div className={`skeleton ${styles.skeletonTag}`} />
                    </div>
                  </div>
                </div>
              ))}
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
                <div
                  key={v.id}
                  className={styles.card}
                  onClick={() => { setEditMode(false); setSelected(v) }}
                >
                  <div className={styles.thumb}>
                    <Image
                      src={`https://image.mux.com/${v.muxPlaybackId}/thumbnail.jpg?width=640&time=0`}
                      alt={v.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className={styles.thumbImg}
                      loading="lazy"
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
                    {v.publishStatus === 'scheduled' && (
                      <span className={styles.scheduledBadge}>⏰ SCHED</span>
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
                    <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.cardActionBtn}
                        onClick={() => { setEditMode(true); setSelected(v) }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className={styles.cardActionBtnDanger}
                        onClick={() => setDeleteVideo(v)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {!loading && hasMore && !search && (
            <div className={styles.loadMoreWrap}>
              <button
                className={styles.btnLoadMore}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <><span className={styles.spinnerSm} /> Loading…</>
                  : 'Load More Videos'
                }
              </button>
            </div>
          )}

          {/* Search scope hint */}
          {search && hasMore && (
            <p className={styles.searchHint}>
              Searching within {videos.length} loaded videos.{' '}
              <button className={styles.btnLink} onClick={handleLoadMore}>
                Load more
              </button>{' '}
              to expand search.
            </p>
          )}
        </div>
      </main>

      {showUpload && (
        <UploadVideoModal onClose={handleUploadClose} />
      )}

      {selected && (
        <VideoPlayerModal
          video={selected}
          onClose={() => { setSelected(null); setEditMode(false) }}
          onDelete={() => { setDeleteVideo(selected); setSelected(null) }}
          onSave={handleEditSave}
          initialEditMode={editMode}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteVideo && (
        <div className={styles.confirmOverlay} onClick={() => setDeleteVideo(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>🗑️</div>
            <div className={styles.confirmTitle}>Delete Video?</div>
            <div className={styles.confirmMsg}>
              Are you sure you want to delete &ldquo;{deleteVideo.title}&rdquo;? This action cannot be undone.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setDeleteVideo(null)}>Cancel</button>
              <button className={styles.confirmDeleteBtn} onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
