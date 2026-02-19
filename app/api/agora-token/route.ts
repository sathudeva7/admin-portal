import { NextRequest, NextResponse } from 'next/server'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

// Token valid for 2 hours
const TOKEN_TTL_SECONDS = 7200

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channelName = searchParams.get('channel')
  const uid = parseInt(searchParams.get('uid') ?? '1', 10)

  if (!channelName) {
    return NextResponse.json({ error: 'Missing ?channel= parameter' }, { status: 400 })
  }

  const appId          = process.env.NEXT_PUBLIC_AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE

  if (!appId || !appCertificate) {
    return NextResponse.json(
      { error: 'AGORA_APP_CERTIFICATE is not set in .env.local — get it from https://console.agora.io' },
      { status: 500 }
    )
  }

  const expireTs = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expireTs,
    expireTs,
  )

  return NextResponse.json({ token, uid, channelName, expiresAt: expireTs })
}
