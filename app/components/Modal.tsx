'use client'

import styles from './Modal.module.css'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onSave: () => void
  children: React.ReactNode
}

export default function Modal({ isOpen, title, onClose, onSave, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 24, padding: '5px 13px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-teal btn-sm"
            style={{ background: 'var(--teal)', color: '#fff', borderRadius: 24, padding: '5px 13px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}
            onClick={onSave}
          >
            Save Teaching
          </button>
        </div>
      </div>
    </div>
  )
}
