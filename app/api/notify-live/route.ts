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
 * Required env vars (Vercel → Settings → Environment Variables):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY   (paste the full key; Vercel keeps real newlines)
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Tell Next.js this route is always dynamic — never statically analysed at
// build time. Without this, Next.js tries to execute module-level code during
// the build when env vars are not yet available, causing the PEM parse error.
export const dynamic = 'force-dynamic'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE    = 100

/**
 * Lazy singleton — initialises the Admin SDK only on the first real request,
 * never during the build phase. Handles both storage formats Vercel may use
 * for the private key (literal \n characters or actual newlines).
 */
function getDb() {
  if (!getApps().length) {
    const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    if (!rawKey) throw new Error('FIREBASE_ADMIN_PRIVATE_KEY env var is not set')

    // Vercel sometimes stores the key with escaped \n or wrapped in quotes — normalise
    const privateKey = rawKey
      .replace(/\\n/g, '\n')       // escaped \n → real newline
      .replace(/^["']|["']$/g, '') // strip surrounding quotes if present
      .trim()

    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    })
  }
  return getFirestore()
}

export async function POST(request: NextRequest) {
  try {
    const { title, sessionId } = await request.json()

    // Initialised here (runtime), not at module level (build time)
    const db = getDb()

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
