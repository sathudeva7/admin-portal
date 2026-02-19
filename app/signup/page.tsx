'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from '../lib/firebase'
import styles from './page.module.css'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      // Create Firebase Auth account
      const { user } = await createUserWithEmailAndPassword(auth, email, password)

      // Set the display name on the Auth profile
      await updateProfile(user, { displayName: name })

      // Create document in the admins collection
      await setDoc(doc(db, COLLECTIONS.ADMINS, user.uid), {
        uid:         user.uid,
        email:       user.email,
        displayName: name,
        role:        'admin',
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      })

      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 8 characters.')
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

        <h2 className={styles.title}>Create an account</h2>
        <p className={styles.subtitle}>Set up your admin access to get started</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className={styles.input}
              placeholder="Rabbi Landau"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

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
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                className={styles.input}
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
