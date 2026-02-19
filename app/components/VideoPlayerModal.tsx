'use client'

import dynamic from 'next/dynamic'
import type { Video } from '../videos/page'
import styles from './VideoPlayerModal.module.css'

// Mux player is browser-only — load it client-side only
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false })

interface Props {
  video: Video
  onClose: () => void
}

export default function VideoPlayerModal({ video, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <button className={styles.closeBtn} onClick={onClose}>✕</button>

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
        </div>

      </div>
    </div>
  )
}
