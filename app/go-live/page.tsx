'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import {
  collection, doc, addDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import { auth, db } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import Sidebar from '../components/Sidebar'
import styles from './page.module.css'

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!

type Phase = 'setup' | 'preview' | 'live' | 'ending'

interface WaitingEntry {
  id: string
  userId: string
  userName: string
  status: 'waiting' | 'in-session' | 'done' | 'left'
  joinedAt: { seconds: number } | null
}

function timeAgo(ts: { seconds: number } | null): string {
  if (!ts) return ''
  const s = Math.floor(Date.now() / 1000) - ts.seconds
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function GoLivePage() {
  const router  = useRouter()
  const ready   = useAdminAuth()

  // Phase + session
  const [phase, setPhase]         = useState<Phase>('setup')
  const [title, setTitle]         = useState('Rabbi Landau — Live Teaching')
  const [channelName, setChannelName] = useState(`rivnitz-live-${Date.now()}`)

  // Live stats
  const [viewerCount, setViewerCount] = useState(0)
  const [elapsed, setElapsed]         = useState(0)

  // Waiting room
  const [waitingRoom, setWaitingRoom]         = useState<WaitingEntry[]>([])
  const [currentConsult, setCurrentConsult]   = useState<WaitingEntry | null>(null)

  // UI
  const [toast, setToast]                   = useState('')
  const [error, setError]                   = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [micMuted, setMicMuted]             = useState(false)
  const [camOff, setCamOff]                 = useState(false)

  // Agora refs
  const clientRef     = useRef<IAgoraRTCClient | null>(null)
  const videoRef      = useRef<ICameraVideoTrack | null>(null)
  const audioRef      = useRef<IMicrophoneAudioTrack | null>(null)
  const sessionIdRef  = useRef<string | null>(null)
  const waitingUnsubRef = useRef<(() => void) | null>(null)

  // ── Elapsed timer while live ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'live') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // ── Play video AFTER the correct container is in the DOM ───────
  useEffect(() => {
    if (phase === 'preview') {
      const raf = requestAnimationFrame(() => {
        videoRef.current?.play('preview-container')
      })
      return () => cancelAnimationFrame(raf)
    }
    if (phase === 'live') {
      const raf = requestAnimationFrame(() => {
        videoRef.current?.play('live-container')
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [phase])

  // ── Cleanup Agora on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      waitingUnsubRef.current?.()
      videoRef.current?.stop(); videoRef.current?.close()
      audioRef.current?.stop(); audioRef.current?.close()
      clientRef.current?.leave()
    }
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  if (!ready) return null

  // ── Start camera preview ──────────────────────────────────────
  const startPreview = async () => {
    setPreviewLoading(true)
    setError('')
    try {
      const { default: AgoraRTC } = await import('agora-rtc-sdk-ng')
      AgoraRTC.setLogLevel(3)
      const track = await AgoraRTC.createCameraVideoTrack({ encoderConfig: '720p' })
      videoRef.current = track
      // video rendered into #preview-container by the useEffect after phase change
      setPhase('preview')
    } catch (err) {
      console.error(err)
      setError('Could not access camera. Check browser permissions and try again.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const stopPreview = () => {
    videoRef.current?.stop(); videoRef.current?.close(); videoRef.current = null
    setPhase('setup')
    setError('')
  }

  // ── Go Live ───────────────────────────────────────────────────
  const goLive = async () => {
    setError('')
    try {
      // ── 1. Fetch a temporary RTC token from our API route ──────
      const hostUid = 1
      const tokenRes = await fetch(
        `/api/agora-token?channel=${encodeURIComponent(channelName)}&uid=${hostUid}`
      )
      if (!tokenRes.ok) {
        const { error } = await tokenRes.json()
        throw new Error(error ?? 'Failed to generate Agora token')
      }
      const { token } = await tokenRes.json()

      // ── 2. Set up Agora client ─────────────────────────────────
      const { default: AgoraRTC } = await import('agora-rtc-sdk-ng')
      AgoraRTC.setLogLevel(3)

      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
      clientRef.current = client
      await client.setClientRole('host')

      client.on('user-joined', () => setViewerCount((c) => c + 1))
      client.on('user-left',   () => setViewerCount((c) => Math.max(0, c - 1)))

      // ── 3. Join channel with generated token ───────────────────
      await client.join(AGORA_APP_ID, channelName, token, hostUid)

      // ── 4. Publish audio + video tracks ───────────────────────
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
      audioRef.current = audioTrack

      const videoTrack = videoRef.current!
      await client.publish([audioTrack, videoTrack])
      // video is rendered into #live-container by the useEffect below
      // (runs after setPhase('live') causes the div to appear in the DOM)

      // ── 5. Save session to Firestore ───────────────────────────
      const sessionRef = await addDoc(collection(db, 'live_sessions'), {
        title,
        status:         'live',
        viewerCount:    0,
        hostUid,
        startedAt:      serverTimestamp(),
        agoraChannel:   channelName,
        agoraToken:     token,        // mobile app uses this to join as audience
        inConsultation: false,
        createdAt:      serverTimestamp(),
      })
      sessionIdRef.current = sessionRef.id

      // ── 6. Subscribe to waiting room in real time ──────────────
      const q = query(
        collection(db, 'live_sessions', sessionRef.id, 'waitingRoom'),
        orderBy('joinedAt', 'asc')
      )
      waitingUnsubRef.current = onSnapshot(q, (snap) => {
        const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WaitingEntry))
        setWaitingRoom(entries.filter((e) => e.status !== 'left'))
        setCurrentConsult(entries.find((e) => e.status === 'in-session') ?? null)
      })

      setPhase('live')
      showToast('🔴 You are live!')
    } catch (err: unknown) {
      console.error('[GoLive]', err)
      const msg = err instanceof Error ? err.message : 'Failed to start broadcast.'
      setError(msg)
    }
  }

  // ── Admit user to private consultation ───────────────────────
  const admitUser = async (entry: WaitingEntry) => {
    const sid = sessionIdRef.current
    if (!sid) return
    // Finish any current consultation
    if (currentConsult) {
      await updateDoc(
        doc(db, 'live_sessions', sid, 'waitingRoom', currentConsult.id),
        { status: 'done' }
      )
    }
    await updateDoc(doc(db, 'live_sessions', sid, 'waitingRoom', entry.id), { status: 'in-session' })
    await updateDoc(doc(db, 'live_sessions', sid), { inConsultation: true })
    showToast(`Admitted ${entry.userName} to consultation`)
  }

  // ── End current consultation ──────────────────────────────────
  const endConsultation = async () => {
    const sid = sessionIdRef.current
    if (!sid || !currentConsult) return
    await updateDoc(
      doc(db, 'live_sessions', sid, 'waitingRoom', currentConsult.id),
      { status: 'done' }
    )
    await updateDoc(doc(db, 'live_sessions', sid), { inConsultation: false })
    showToast('Consultation ended')
  }

  // ── Toggle mic ────────────────────────────────────────────────
  const toggleMic = async () => {
    if (!audioRef.current) return
    await audioRef.current.setEnabled(micMuted)
    setMicMuted((m) => !m)
  }

  // ── Toggle camera ─────────────────────────────────────────────
  const toggleCam = async () => {
    if (!videoRef.current) return
    await videoRef.current.setEnabled(camOff)
    setCamOff((c) => !c)
  }

  // ── End session ───────────────────────────────────────────────
  const endSession = async () => {
    setPhase('ending')
    waitingUnsubRef.current?.(); waitingUnsubRef.current = null

    if (sessionIdRef.current) {
      await updateDoc(doc(db, 'live_sessions', sessionIdRef.current), { status: 'ended' })
    }

    videoRef.current?.stop(); videoRef.current?.close(); videoRef.current = null
    audioRef.current?.stop(); audioRef.current?.close(); audioRef.current = null
    await clientRef.current?.leave(); clientRef.current = null
    sessionIdRef.current = null

    setElapsed(0); setViewerCount(0)
    setWaitingRoom([]); setCurrentConsult(null)
    setMicMuted(false); setCamOff(false)
    setChannelName(`rivnitz-live-${Date.now()}`)
    setPhase('setup')
    showToast('Session ended')
  }

  const handleLogout = async () => {
    if (phase === 'live') await endSession()
    await signOut(auth)
    router.push('/login')
  }

  const waitingUsers = waitingRoom.filter((e) => e.status === 'waiting')
  const doneUsers    = waitingRoom.filter((e) => e.status === 'done')

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={styles.layout}>
      <Sidebar activeNav="Live Sessions" />

      <main className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>📺 Go Live</h1>
            <p className={styles.pageSub}>Broadcast live to your community via Agora</p>
          </div>
          <div className={styles.topbarRight}>
            {phase === 'live' && (
              <div className={styles.livePill}>
                <span className={styles.liveDot} />
                LIVE · {formatDuration(elapsed)}
              </div>
            )}
            <button className={styles.btnLogout} onClick={handleLogout}>Sign Out</button>
          </div>
        </div>

        <div className={styles.content}>

          {/* ── SETUP phase ─────────────────────────────────── */}
          {(phase === 'setup' || phase === 'preview') && (
            <div className={styles.setupLayout}>
              <div className={styles.setupCard}>
                <h2 className={styles.setupTitle}>
                  {phase === 'preview' ? '📹 Preview — Ready to go?' : '🎙 Set Up Your Broadcast'}
                </h2>
                <p className={styles.setupSub}>
                  {phase === 'preview'
                    ? 'Check your camera and audio, then go live when ready.'
                    : 'Enter a session title and test your camera before going live.'}
                </p>

                {/* Video preview box */}
                <div className={styles.previewBox}>
                  <div id="preview-container" className={styles.previewVideo} />
                  {phase === 'setup' && (
                    <div className={styles.previewEmpty}>
                      <span className={styles.previewEmptyIcon}>🎥</span>
                      <p>Camera preview appears here</p>
                    </div>
                  )}
                </div>

                {/* Session config */}
                <div className={styles.configGrid}>
                  <div className={styles.configField}>
                    <label className={styles.configLabel}>Session Title</label>
                    <input
                      className={styles.configInput}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Weekly Teaching — Parsha Discussion"
                      disabled={phase === 'preview'}
                    />
                  </div>
                  <div className={styles.configField}>
                    <label className={styles.configLabel}>Agora Channel</label>
                    <input
                      className={styles.configInput}
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="e.g. rivnitz-live"
                      disabled={phase === 'preview'}
                    />
                  </div>
                </div>

                {error && <p className={styles.errorMsg}>{error}</p>}

                <div className={styles.setupActions}>
                  {phase === 'setup' && (
                    <button
                      className={styles.btnTestCam}
                      onClick={startPreview}
                      disabled={previewLoading || !title.trim() || !channelName.trim()}
                    >
                      {previewLoading ? 'Starting camera…' : '📷 Test Camera'}
                    </button>
                  )}
                  {phase === 'preview' && (
                    <>
                      <button className={styles.btnBack} onClick={stopPreview}>← Back</button>
                      <button className={styles.btnGoLive} onClick={goLive}>🔴 Go Live Now</button>
                    </>
                  )}
                </div>
              </div>

              {/* Info panel */}
              <div className={styles.infoPanel}>
                <h3 className={styles.infoPanelTitle}>How it works</h3>
                <div className={styles.infoSteps}>
                  {[
                    ['1', 'Set a session title and test your camera', '🎥'],
                    ['2', 'Click Go Live — a Firestore session is created and Agora broadcast starts', '🔴'],
                    ['3', 'Members join from the app and see your stream', '👥'],
                    ['4', 'Members can join the waiting room for a private consultation', '🕊'],
                    ['5', 'Admit members one by one for a private 2-way video call', '🤝'],
                    ['6', 'End the session when you\'re done', '✓'],
                  ].map(([num, text, icon]) => (
                    <div key={num} className={styles.infoStep}>
                      <div className={styles.infoStepNum}>{num}</div>
                      <div>
                        <span className={styles.infoStepIcon}>{icon}</span>
                        <span className={styles.infoStepText}>{text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LIVE phase ──────────────────────────────────── */}
          {phase === 'live' && (
            <div className={styles.liveLayout}>

              {/* Left: video + controls */}
              <div className={styles.videoCol}>
                {/* Video area */}
                <div className={styles.videoWrapper}>
                  <div id="live-container" className={styles.liveVideo} />
                  <div className={styles.videoTopLeft}>
                    <span className={styles.liveTag}>● LIVE</span>
                    <span className={styles.elapsedTag}>{formatDuration(elapsed)}</span>
                  </div>
                  <div className={styles.videoBottomRight}>
                    <span className={styles.viewerTag}>👁 {viewerCount}</span>
                  </div>
                  {camOff && (
                    <div className={styles.camOffOverlay}>
                      <span>📷 Camera paused</span>
                    </div>
                  )}
                </div>

                {/* Broadcast info */}
                <div className={styles.broadcastMeta}>
                  <div className={styles.broadcastTitle}>{title}</div>
                  <div className={styles.broadcastChannel}>📡 {channelName}</div>
                </div>

                {/* Controls row */}
                <div className={styles.controls}>
                  <button
                    className={`${styles.controlBtn} ${micMuted ? styles.controlBtnOff : ''}`}
                    onClick={toggleMic}
                  >
                    {micMuted ? '🔇 Unmute' : '🎙 Mute'}
                  </button>
                  <button
                    className={`${styles.controlBtn} ${camOff ? styles.controlBtnOff : ''}`}
                    onClick={toggleCam}
                  >
                    {camOff ? '📷 Resume Cam' : '📹 Pause Cam'}
                  </button>
                  <button className={styles.btnEndSession} onClick={endSession}>
                    ■ End Session
                  </button>
                </div>

                {/* Consultation banner */}
                {currentConsult && (
                  <div className={styles.consultBanner}>
                    <div className={styles.consultLeft}>
                      <span className={styles.consultDot} />
                      <div>
                        <div className={styles.consultLabel}>Private consultation active</div>
                        <div className={styles.consultName}>{currentConsult.userName}</div>
                      </div>
                    </div>
                    <button className={styles.btnEndConsult} onClick={endConsultation}>
                      End Consultation
                    </button>
                  </div>
                )}
              </div>

              {/* Right: waiting room */}
              <div className={styles.waitingCol}>
                <div className={styles.waitingCard}>
                  <div className={styles.waitingHeader}>
                    <span className={styles.waitingTitle}>👥 Waiting Room</span>
                    <span className={styles.waitingBadge}>{waitingUsers.length}</span>
                  </div>

                  {waitingRoom.length === 0 ? (
                    <div className={styles.emptyWaiting}>
                      <span className={styles.emptyIcon}>🕊</span>
                      <p>No one in the queue yet</p>
                      <p className={styles.emptySub}>Members can join from the mobile app</p>
                    </div>
                  ) : (
                    <div className={styles.waitingList}>
                      {waitingRoom.map((entry, idx) => (
                        <div
                          key={entry.id}
                          className={`${styles.waitingEntry}
                            ${entry.status === 'in-session' ? styles.entryInSession : ''}
                            ${entry.status === 'done'       ? styles.entryDone       : ''}
                          `}
                        >
                          <div className={styles.entryLeft}>
                            <div className={styles.entryPos}>{idx + 1}</div>
                            <div>
                              <div className={styles.entryName}>{entry.userName}</div>
                              <div className={styles.entryMeta}>
                                Joined {timeAgo(entry.joinedAt)}
                              </div>
                            </div>
                          </div>
                          <div className={styles.entryRight}>
                            {entry.status === 'waiting' && (
                              <button
                                className={styles.btnAdmit}
                                onClick={() => admitUser(entry)}
                              >
                                Admit
                              </button>
                            )}
                            {entry.status === 'in-session' && (
                              <span className={styles.inSessionTag}>● In session</span>
                            )}
                            {entry.status === 'done' && (
                              <span className={styles.doneTag}>✓ Done</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {doneUsers.length > 0 && (
                    <div className={styles.waitingFooter}>
                      {doneUsers.length} consultation{doneUsers.length > 1 ? 's' : ''} completed today
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ENDING phase ────────────────────────────────── */}
          {phase === 'ending' && (
            <div className={styles.endingView}>
              <div className={styles.endingCard}>
                <div className={styles.endingSpinner} />
                <p className={styles.endingText}>Ending session…</p>
              </div>
            </div>
          )}

        </div>

        {toast && <div className={styles.toast}>{toast}</div>}
      </main>
    </div>
  )
}
