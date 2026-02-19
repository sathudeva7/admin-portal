'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from '../lib/firebase'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign in with Firebase Auth
      const { user } = await signInWithEmailAndPassword(auth, email, password)

      // Verify the user exists in the admins collection
      const adminRef = doc(db, COLLECTIONS.ADMINS, user.uid)
      const adminSnap = await getDoc(adminRef)

      if (!adminSnap.exists()) {
        await auth.signOut()
        setError('Access denied. You do not have admin privileges.')
        setLoading(false)
        return
      }

      // Update last login timestamp
      await updateDoc(adminRef, { lastLoginAt: serverTimestamp() })

      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>✦</span>
          <h1 className={styles.brandName}>Rivnitz</h1>
          <p className={styles.brandSub}>Admin Portal</p>
        </div>

        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Sign in to manage your AI knowledge base</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@rivnitz.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
