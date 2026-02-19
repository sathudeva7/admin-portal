'use client'

import { useEffect } from 'react'
import styles from './Toast.module.css'

interface ToastProps {
  message: string
  visible: boolean
  onHide: () => void
}

export default function Toast({ message, visible, onHide }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 3200)
      return () => clearTimeout(timer)
    }
  }, [visible, onHide])

  return (
    <div className={`${styles.toast} ${visible ? styles.show : ''}`}>
      <span>{message}</span>
    </div>
  )
}
