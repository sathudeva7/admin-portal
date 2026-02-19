import { NextResponse } from 'next/server'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId:     process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export async function POST() {
  try {
    const upload = await mux.video.uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'capped-1080p',
      },
    })

    return NextResponse.json({
      uploadId:  upload.id,
      uploadUrl: upload.url,
    })
  } catch (err) {
    console.error('[mux-upload]', err)
    return NextResponse.json({ error: 'Failed to create Mux upload URL' }, { status: 500 })
  }
}
