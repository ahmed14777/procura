import { NextResponse } from 'next/server'
import { cleanupExpiredBlobs } from '@/lib/blobCleanup'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Servizio non configurato.' }, { status: 503 })
  }

  const authorized = request.headers.get('authorization') === `Bearer ${secret}`

  if (!authorized) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 })
  }

  const deletedFiles = await cleanupExpiredBlobs()
  return NextResponse.json({ success: true, deletedFiles })
}
