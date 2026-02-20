/**
 * POST /api/notify-live
 *
 * Called by the Go Live page when a session starts.
 * Uses Firebase Admin SDK (bypasses Firestore security rules) to
 * fetch all user Expo push tokens, then sends batch push
 * notifications via the Expo Push API.
 *
 * Body: { title: string, sessionId: string }
 *
 * Required env vars (Vercel):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY   (the full private key string, newlines as \n)
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialise Admin SDK once (Next.js hot-reloads can call this file multiple times)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Vercel stores the key with literal \n — replace them back to real newlines
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE    = 100

export async function POST(request: NextRequest) {
  try {
    const { title, sessionId } = await request.json()

    // Admin SDK bypasses Firestore security rules — no auth needed
    const usersSnap = await db.collection('users')
      .where('pushEnabled', '==', true)
      .get()

    const tokens = usersSnap.docs
      .map(d => d.data().expoPushToken as string | undefined)
      .filter((t): t is string => !!t)

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No registered devices found' })
    }

    // Build one Expo push message per token
    const messages = tokens.map(token => ({
      to:        token,
      channelId: 'live',
      title:     '📺 Rabbi Landau is Live Now!',
      body:      title || 'Join the live session with Rabbi Landau.',
      data:      { screen: 'Live', sessionId },
      sound:     'default',
      priority:  'high',
    }))

    // Send in batches of 100 (Expo Push API limit)
    const results = []
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const res   = await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'Accept':          'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      })
      const json = await res.json()
      results.push(json)
    }

    console.log(`[notify-live] Sent to ${tokens.length} devices for session ${sessionId}`)
    return NextResponse.json({ sent: tokens.length, results })
  } catch (err) {
    console.error('[notify-live] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
