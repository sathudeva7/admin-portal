'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from './firebase'

export function useAdminAuth() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

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
      setReady(true)
    })
    return unsubscribe
  }, [router])

  return ready
}
