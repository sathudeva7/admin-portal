import { NextRequest, NextResponse } from 'next/server'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId:     process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// GET /api/mux-asset?uploadId=xxx
// Returns { status, assetId?, playbackId?, duration? }
export async function GET(request: NextRequest) {
  const uploadId = request.nextUrl.searchParams.get('uploadId')
  if (!uploadId) {
    return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
  }

  try {
    // Step 1: get upload to find the assetId
    const upload = await mux.video.uploads.retrieve(uploadId)

    if (!upload.asset_id) {
      return NextResponse.json({ status: 'waiting' })
    }

    // Step 2: get the asset to find playbackId and duration
    const asset = await mux.video.assets.retrieve(upload.asset_id)

    if (asset.status === 'errored') {
      return NextResponse.json({ status: 'errored', error: 'Mux asset processing failed' })
    }

    if (asset.status !== 'ready') {
      return NextResponse.json({ status: 'processing' })
    }

    const playbackId = asset.playback_ids?.[0]?.id ?? null
    const duration   = asset.duration ? formatDuration(asset.duration) : null

    return NextResponse.json({
      status:     'ready',
      assetId:    asset.id,
      playbackId,
      duration,
    })
  } catch (err) {
    console.error('[mux-asset]', err)
    return NextResponse.json({ error: 'Failed to retrieve Mux asset' }, { status: 500 })
  }
}
