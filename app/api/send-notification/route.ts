/**
 * POST /api/send-notification
 *
 * Manual push notification sender — called from the Notifications page.
 * Uses Firebase Admin SDK to fetch all eligible user push tokens, then
 * delivers them via the Expo Push API in batches of 100.
 *
 * Body: {
 *   title:          string          — notification title
 *   body:           string          — notification body
 *   targetAudience: 'all'|'premium' — who to send to (default: 'all')
 *   sentBy:         string          — admin display name for history log
 * }
 *
 * Required env vars:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE    = 100

function getDb() {
  if (!getApps().length) {
    const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    if (!rawKey) throw new Error('FIREBASE_ADMIN_PRIVATE_KEY env var is not set')

    const privateKey = rawKey.includes('\\n')
      ? rawKey.replace(/\\n/g, '\n')
      : rawKey

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
    const {
      title,
      body,
      targetAudience = 'all',
      sentBy         = 'Admin',
    } = await request.json()

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 },
      )
    }

    const db = getDb()

    // Fetch all users with push notifications enabled
    let query: FirebaseFirestore.Query = db.collection('users')
      .where('pushEnabled', '==', true)

    // Optionally restrict to premium members
    if (targetAudience === 'premium') {
      query = query.where('membershipTier', '==', 'premium')
    }

    const usersSnap = await query.get()

    const tokens = usersSnap.docs
      .map(d => d.data().expoPushToken as string | undefined)
      .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken'))

    if (tokens.length === 0) {
      return NextResponse.json({
        sent:    0,
        message: 'No registered devices found',
      })
    }

    // Build one message per token
    const messages = tokens.map(token => ({
      to:        token,
      title,
      body,
      sound:     'default',
      priority:  'high',
      channelId: 'default',
    }))

    // Deliver in batches of 100 (Expo Push API limit)
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
      results.push(await res.json())
    }

    // Persist a log entry to Firestore for the history view
    await db.collection('notifications').add({
      title,
      body,
      targetAudience,
      sentBy,
      sentCount: tokens.length,
      sentAt:    FieldValue.serverTimestamp(),
      type:      'manual',
    })

    console.log(`[send-notification] Sent to ${tokens.length} devices (audience: ${targetAudience})`)
    return NextResponse.json({ sent: tokens.length, results })
  } catch (err) {
    console.error('[send-notification] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
