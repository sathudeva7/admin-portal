'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import Sidebar from '../components/Sidebar'
import Toast from '../components/Toast'
import KnowledgeTab from '../components/KnowledgeTab'
import SystemPromptTab from '../components/SystemPromptTab'
import VideoSyncTab from '../components/VideoSyncTab'
import BehaviorTab from '../components/BehaviorTab'
import TestTab from '../components/TestTab'
import AddEntryModal from '../components/AddEntryModal'
import styles from './page.module.css'

type TabId = 'knowledge' | 'system' | 'sync' | 'behavior' | 'test'

const TABS: { id: TabId; label: string }[] = [
  { id: 'knowledge', label: '📚 Knowledge Entries' },
  { id: 'system',    label: '⚙️ System Prompt' },
  { id: 'sync',      label: '🔄 Video Auto-Sync' },
  { id: 'behavior',  label: '🎛️ AI Behavior' },
  { id: 'test',      label: '🧪 Test the AI' },
]

export default function AIKnowledgeBase() {
  const router = useRouter()
  const ready = useAdminAuth()
  const [activeTab, setActiveTab] = useState<TabId>('knowledge')
  const [toast, setToast] = useState({ visible: false, message: '' })
  const [modalOpen, setModalOpen] = useState(false)

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  const showToast = useCallback((msg: string) => {
    setToast({ visible: true, message: msg })
  }, [])

  const hideToast = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }))
  }, [])

  const handleSaveEntry = () => {
    setModalOpen(false)
    showToast('✓ New teaching added to knowledge base')
  }

  if (!ready) return null

  return (
    <div className={styles.layout}>
      <Sidebar activeNav="AI Knowledge Base" />

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.topbarTitle}>🧠 AI Knowledge Base</h1>
            <p className={styles.topbarSub}>Everything the AI Coach knows comes from here. Feed it Rabbi's teachings, guidelines & wisdom.</p>
          </div>
          <div className={styles.topbarActions}>
            <div className={styles.syncRow}>
              <div className={styles.syncDot} />
              <span className={styles.syncText}>AI is live · Last updated 3 min ago</span>
            </div>
            <button className={styles.btnTeal} onClick={() => setModalOpen(true)}>
              + Add Teaching
            </button>
            <button className={styles.btnLogout} onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {activeTab === 'knowledge' && <KnowledgeTab showToast={showToast} onAddEntry={() => setModalOpen(true)} />}
          {activeTab === 'system'    && <SystemPromptTab showToast={showToast} />}
          {activeTab === 'sync'      && <VideoSyncTab showToast={showToast} />}
          {activeTab === 'behavior'  && <BehaviorTab showToast={showToast} />}
          {activeTab === 'test'      && <TestTab showToast={showToast} />}
        </div>
      </main>

      <AddEntryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEntry}
      />

      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </div>
  )
}
