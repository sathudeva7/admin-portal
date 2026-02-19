'use client'

import { useState } from 'react'
import { KNOWLEDGE_ENTRIES } from '../data'
import styles from './KnowledgeTab.module.css'

interface KnowledgeTabProps {
  showToast: (msg: string) => void
  onAddEntry: () => void
}

export default function KnowledgeTab({ showToast, onAddEntry }: KnowledgeTabProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')

  const filtered = KNOWLEDGE_ENTRIES.filter((e) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.preview.toLowerCase().includes(search.toLowerCase())
    const matchCat = !category || e.category === category
    const matchSrc = !source || e.source === source
    return matchSearch && matchCat && matchSrc
  })

  const badgeClass = (status: string) => {
    if (status === 'Live') return styles.badgeGreen
    if (status === 'Draft') return styles.badgeGold
    return styles.badgeMuted
  }

  const priorityClass = (p: string) => {
    if (p === 'High') return styles.badgeTeal
    return styles.badgeMuted
  }

  return (
    <div className={styles.wrapper}>
      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statMini}>
          <div className={styles.statNum}>{KNOWLEDGE_ENTRIES.length}</div>
          <div className={styles.statLabel}>Total Entries</div>
        </div>
        <div className={styles.statMini}>
          <div className={styles.statNum}>31</div>
          <div className={styles.statLabel}>Core Teachings</div>
        </div>
        <div className={styles.statMini}>
          <div className={styles.statNum}>12</div>
          <div className={styles.statLabel}>From Videos</div>
        </div>
        <div className={styles.statMini}>
          <div className={styles.statNum}>4</div>
          <div className={styles.statLabel}>AI Guidelines</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        <input
          className={styles.searchInput}
          placeholder="🔍  Search teachings, topics, keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option>Core Teachings</option>
          <option>Marriage & Relationships</option>
          <option>Faith & Prayer</option>
          <option>Anger & Emotions</option>
          <option>Parenting</option>
          <option>Purpose & Mission</option>
          <option>Daily Life</option>
          <option>AI Guidelines</option>
        </select>
        <select className={styles.select} style={{ maxWidth: 150 }} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All Sources</option>
          <option>Manual</option>
          <option>From Video</option>
          <option>Document Upload</option>
        </select>
      </div>

      {/* Entry list */}
      <div className={styles.entryList}>
        {filtered.map((entry) => (
          <div key={entry.id} className={styles.entryCard}>
            <div className={styles.entryIcon} style={{ background: entry.iconBg }}>
              {entry.icon}
            </div>
            <div className={styles.entryInfo}>
              <div className={styles.entryTitle}>{entry.title}</div>
              <div className={styles.entryPreview}>{entry.preview}</div>
              <div className={styles.entryMeta}>
                <span className={`${styles.badge} ${styles.badgeTeal}`}>{entry.category}</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>{entry.source}</span>
                <span className={`${styles.badge} ${priorityClass(entry.priority)}`}>{entry.priority} Priority</span>
                <span className={`${styles.badge} ${badgeClass(entry.status)}`}>● {entry.status}</span>
                <span className={styles.metaTime}>Updated {entry.updated}</span>
              </div>
            </div>
            <div className={styles.entryActions}>
              <button className={styles.btnIcon} onClick={() => showToast('✓ Entry editing mode — connect to your database')}>✏️</button>
              <button className={`${styles.btnIcon} ${styles.btnIconRed}`} onClick={() => showToast('🗑 Delete functionality — connect to your database')}>🗑</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>No entries match your filters.</div>
        )}
      </div>
    </div>
  )
}
