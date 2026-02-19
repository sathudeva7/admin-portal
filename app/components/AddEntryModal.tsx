'use client'

import { useState } from 'react'
import Modal from './Modal'
import styles from './AddEntryModal.module.css'

interface AddEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function AddEntryModal({ isOpen, onClose, onSave }: AddEntryModalProps) {
  const [tags, setTags] = useState<string[]>(['marriage', 'relationships'])
  const [tagInput, setTagInput] = useState('')

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim().replace(',', '')
      if (val && !tags.includes(val)) setTags([...tags, val])
      setTagInput('')
    }
  }

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t))

  return (
    <Modal isOpen={isOpen} title="✦ Add New Teaching" onClose={onClose} onSave={onSave}>
      <div className={styles.grid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Entry Title <span className={styles.req}>*</span></label>
          <input className={styles.input} placeholder="e.g. The Source of Anger in Marriage" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Category <span className={styles.req}>*</span></label>
          <select className={styles.select}>
            <option>Core Teachings</option>
            <option>Marriage & Relationships</option>
            <option>Faith & Prayer</option>
            <option>Anger & Emotions</option>
            <option>Parenting</option>
            <option>Purpose & Mission</option>
            <option>Daily Life</option>
            <option>AI Guidelines</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Teaching Content <span className={styles.req}>*</span></label>
        <textarea className={styles.textarea} placeholder="Enter the full teaching, principle, or guideline the AI should know and reference..." />
        <div className={styles.hint}>Write as if you're explaining this to the AI. The more clear and detailed, the better the AI's responses will be.</div>
      </div>

      <div className={styles.grid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Source</label>
          <select className={styles.select}>
            <option>Manual Entry</option>
            <option>From Video</option>
            <option>Document Upload</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Priority</label>
          <select className={styles.select}>
            <option>High — Core to every response</option>
            <option>Medium — Use when relevant</option>
            <option>Low — Background context</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Tags <span className={styles.labelSub}>Press Enter to add</span></label>
        <div className={styles.tagWrap}>
          {tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
              <span className={styles.tagRemove} onClick={() => removeTag(t)}>✕</span>
            </span>
          ))}
          <input
            className={styles.tagInput}
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Source Video <span className={styles.labelSub}>Optional</span></label>
        <select className={styles.select}>
          <option value="">— Link to a video (optional) —</option>
          <option>The Path of True Teshuva</option>
          <option>Finding Shalom Bayis Through Inner Peace</option>
          <option>Anger: Understanding the Root</option>
        </select>
      </div>
    </Modal>
  )
}
