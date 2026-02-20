'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import {
  collection, onSnapshot, query, orderBy, limit,
  doc, deleteDoc, updateDoc,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import styles from './page.module.css'

interface Post {
  id: string
  content: string
  authorId: string
  authorName: string
  likes: string[]
  replyCount: number
  pinned: boolean
  createdAt: { seconds: number } | null
}

interface Reply {
  id: string
  content: string
  authorId: string
  authorName: string
  createdAt: { seconds: number } | null
}

function timeAgo(ts: { seconds: number } | null): string {
  if (!ts) return ''
  const secs = Math.floor(Date.now() / 1000) - ts.seconds
  if (secs < 60)    return `${secs}s ago`
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['#1B6B6B', '#D4933A', '#5B8DB8', '#8B6BAE', '#4CAF82', '#D95F5F']
function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

export default function CommunityPage() {
  const router = useRouter()
  const { ready } = useAdminAuth()

  const [posts, setPosts]               = useState<Post[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<'all' | 'pinned' | 'popular'>('all')
  const [search, setSearch]             = useState('')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [replies, setReplies]           = useState<Reply[]>([])
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [toast, setToast]               = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Post | null>(null)

  // Live post feed
  useEffect(() => {
    if (!ready) return
    const q = query(
      collection(db, 'community_posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)))
      setLoading(false)
    })
    return unsub
  }, [ready])

  // Live replies for selected post
  useEffect(() => {
    if (!selectedPost) { setReplies([]); return }
    setRepliesLoading(true)
    const q = query(
      collection(db, 'community_posts', selectedPost.id, 'replies'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reply)))
      setRepliesLoading(false)
    })
    return unsub
  }, [selectedPost?.id])

  if (!ready) return null

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  const handlePin = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation()
    await updateDoc(doc(db, 'community_posts', post.id), { pinned: !post.pinned })
    showToast(post.pinned ? 'Post unpinned' : 'Post pinned to top')
  }

  const handleDelete = async (post: Post) => {
    await deleteDoc(doc(db, 'community_posts', post.id))
    if (selectedPost?.id === post.id) setSelectedPost(null)
    setDeleteConfirm(null)
    showToast('Post deleted')
  }

  const handleDeleteReply = async (reply: Reply) => {
    if (!selectedPost) return
    await deleteDoc(doc(db, 'community_posts', selectedPost.id, 'replies', reply.id))
    showToast('Reply deleted')
  }

  const filtered = posts.filter((p) => {
    if (filter === 'pinned' && !p.pinned) return false
    if (filter === 'popular' && (p.likes?.length ?? 0) < 3) return false
    if (search) {
      const q = search.toLowerCase()
      return p.content.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q)
    }
    return true
  })

  const pinnedCount      = posts.filter((p) => p.pinned).length
  const totalReplies     = posts.reduce((s, p) => s + (p.replyCount ?? 0), 0)
  const totalLikes       = posts.reduce((s, p) => s + (p.likes?.length ?? 0), 0)
  const uniqueAuthors    = new Set(posts.map((p) => p.authorId)).size

  return (
    <main className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>💬 Community</h1>
            <p className={styles.pageSub}>Moderate and manage member discussions in real time</p>
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.btnLogout} onClick={handleLogout}>Sign Out</button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Posts</div>
              <div className={styles.statValue}>{posts.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Replies</div>
              <div className={styles.statValue}>{totalReplies}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Likes</div>
              <div className={styles.statValue}>{totalLikes}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Active Authors</div>
              <div className={styles.statValue}>{uniqueAuthors}</div>
            </div>
          </div>

          {/* Posts + Replies split */}
          <div className={`${styles.splitView} ${selectedPost ? styles.splitActive : ''}`}>
            {/* Left: post list */}
            <div className={styles.postsPanel}>
              {/* Filter bar */}
              <div className={styles.filterBar}>
                <div className={styles.filterTabs}>
                  {([
                    ['all',     `All (${posts.length})`],
                    ['pinned',  `📌 Pinned (${pinnedCount})`],
                    ['popular', '🔥 Popular'],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      className={`${styles.filterTab} ${filter === val ? styles.filterTabActive : ''}`}
                      onClick={() => setFilter(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  className={styles.searchInput}
                  placeholder="Search posts or authors…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Post list */}
              <div className={styles.postList}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={styles.skeletonPostCard}>
                      <div className={styles.skeletonPostHeader}>
                        <div className={`skeleton ${styles.skeletonAvatarCircle}`} />
                        <div className={styles.skeletonPostMeta}>
                          <div className={`skeleton ${styles.skeletonAuthorLine}`} />
                          <div className={`skeleton ${styles.skeletonTimeLine}`} />
                        </div>
                      </div>
                      <div className={`skeleton ${styles.skeletonContent}`} />
                      <div className={`skeleton ${styles.skeletonContentSm}`} />
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className={styles.empty}>No posts found</div>
                ) : (
                  filtered.map((post) => (
                    <div
                      key={post.id}
                      className={`${styles.postCard} ${selectedPost?.id === post.id ? styles.postCardSelected : ''}`}
                      onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                    >
                      {post.pinned && <div className={styles.pinnedStrip}>📌 Pinned post</div>}
                      <div className={styles.postHeader}>
                        <div
                          className={styles.avatar}
                          style={{ background: avatarColor(post.authorName) }}
                        >
                          {getInitials(post.authorName)}
                        </div>
                        <div className={styles.postMeta}>
                          <div className={styles.postAuthor}>{post.authorName}</div>
                          <div className={styles.postTime}>{timeAgo(post.createdAt)}</div>
                        </div>
                        <div className={styles.postActions}>
                          <button
                            className={`${styles.iconBtn} ${post.pinned ? styles.iconBtnPinned : ''}`}
                            onClick={(e) => handlePin(post, e)}
                            title={post.pinned ? 'Unpin' : 'Pin to top'}
                          >
                            📌
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(post) }}
                            title="Delete post"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <p className={styles.postContent}>{post.content}</p>

                      <div className={styles.postFooter}>
                        <span className={styles.postStat}>❤️ {post.likes?.length ?? 0}</span>
                        <span className={styles.postStat}>💬 {post.replyCount ?? 0} replies</span>
                        {selectedPost?.id === post.id && (
                          <span className={styles.viewingBadge}>Viewing replies →</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: replies panel */}
            {selectedPost && (
              <div className={styles.repliesPanel}>
                <div className={styles.repliesHeader}>
                  <div>
                    <div className={styles.repliesTitle}>💬 Replies</div>
                    <div className={styles.repliesSub}>
                      by {selectedPost.authorName} · {selectedPost.replyCount ?? 0} replies
                    </div>
                  </div>
                  <button className={styles.closeBtn} onClick={() => setSelectedPost(null)}>✕</button>
                </div>

                {/* Original post */}
                <div className={styles.originalPost}>
                  <div
                    className={styles.originalAvatar}
                    style={{ background: avatarColor(selectedPost.authorName) }}
                  >
                    {getInitials(selectedPost.authorName)}
                  </div>
                  <div>
                    <div className={styles.originalAuthor}>{selectedPost.authorName}</div>
                    <p className={styles.originalContent}>{selectedPost.content}</p>
                  </div>
                </div>

                <div className={styles.divider} />

                {/* Replies list */}
                <div className={styles.repliesList}>
                  {repliesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles.skeletonReplyCard}>
                        <div className={styles.skeletonReplyHeader}>
                          <div className={`skeleton ${styles.skeletonReplyAvatar}`} />
                          <div className={styles.skeletonPostMeta}>
                            <div className={`skeleton ${styles.skeletonAuthorLine}`} />
                            <div className={`skeleton ${styles.skeletonTimeLine}`} />
                          </div>
                        </div>
                        <div className={`skeleton ${styles.skeletonReplyContent}`} />
                      </div>
                    ))
                  ) : replies.length === 0 ? (
                    <div className={styles.emptyReplies}>No replies yet on this post</div>
                  ) : (
                    replies.map((reply) => (
                      <div key={reply.id} className={styles.replyCard}>
                        <div className={styles.replyHeader}>
                          <div
                            className={styles.replyAvatar}
                            style={{ background: avatarColor(reply.authorName) }}
                          >
                            {getInitials(reply.authorName)}
                          </div>
                          <div className={styles.postMeta}>
                            <div className={styles.postAuthor}>{reply.authorName}</div>
                            <div className={styles.postTime}>{timeAgo(reply.createdAt)}</div>
                          </div>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => handleDeleteReply(reply)}
                            title="Delete reply"
                          >
                            🗑
                          </button>
                        </div>
                        <p className={styles.replyContent}>{reply.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>Delete Post?</h3>
              <p className={styles.modalSub}>
                This will permanently remove the post by <strong>{deleteConfirm.authorName}</strong> and cannot be undone.
              </p>
              <div className={styles.modalActions}>
                <button className={styles.modalCancel} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className={styles.modalDelete} onClick={() => handleDelete(deleteConfirm)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && <div className={styles.toast}>✓ {toast}</div>}
      </main>
  )
}
