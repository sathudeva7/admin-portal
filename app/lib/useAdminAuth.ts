'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from './firebase'

export type AdminRole = 'super_admin' | 'moderator' | 'rabbi'

interface AdminSession {
  ready: boolean
  role: AdminRole | null
  displayName: string | null
  uid: string | null
}

const INITIAL: AdminSession = { ready: false, role: null, displayName: null, uid: null }

export function useAdminAuth(): AdminSession {
  const router = useRouter()
  const [session, setSession] = useState<AdminSession>(INITIAL)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login')
        return
      }
      const adminSnap = await getDoc(doc(db, COLLECTIONS.ADMINS, user.uid))
      if (!adminSnap.exists()) {
        await signOut(auth)
        router.replace('/login')
        return
      }
      const data = adminSnap.data()
      const adminRef = doc(db, COLLECTIONS.ADMINS, user.uid)

      // Migrate legacy 'admin' role to 'super_admin' on first login
      let role: AdminRole = data.role ?? 'moderator'
      if ((role as string) === 'admin') {
        role = 'super_admin'
        await updateDoc(adminRef, { role: 'super_admin', updatedAt: serverTimestamp() })
      }

      setSession({
        ready:       true,
        role,
        displayName: data.displayName ?? user.displayName ?? user.email,
        uid:         user.uid,
      })
    })
    return unsubscribe
  }, [router])

  return session
}
