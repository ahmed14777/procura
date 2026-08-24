import { NextResponse } from 'next/server'
import {
  canSubmitCapture,
  canRetrieveCapture,
  deleteCaptureSession,
  getCaptureFileMetadata,
  getCaptureSession,
  saveCapturedFile,
} from '@/lib/captureSessions'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const session = await getCaptureSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Sessione scaduta.' }, { status: 404 })
  }

  const metadata = getCaptureFileMetadata(session)
  if (!metadata) return NextResponse.json({ status: 'pending' })

  const retrievalToken = new URL(request.url).searchParams.get('retrievalToken')
  if (!canRetrieveCapture(session, retrievalToken)) {
    return NextResponse.json({ error: 'Accesso non autorizzato.' }, { status: 403 })
  }
  const fileUrl = `/api/capture-sessions/${sessionId}/file?retrievalToken=${encodeURIComponent(retrievalToken!)}`
  return NextResponse.json({ status: 'ready', file: { ...metadata, url: fileUrl } })
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const session = await getCaptureSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Sessione scaduta.' }, { status: 404 })
  }

  const formData = await request.formData()
  const submitTokenFromBody = formData.get('submitToken')
  const submitTokenFromQuery = new URL(request.url).searchParams.get('submitToken')
  const submitToken =
    typeof submitTokenFromBody === 'string' && submitTokenFromBody
      ? submitTokenFromBody
      : submitTokenFromQuery
  if (!canSubmitCapture(session, submitToken)) {
    return NextResponse.json({ error: 'Accesso non autorizzato.' }, { status: 403 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Scatta una foto.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Formato foto non supportato.' }, { status: 415 })
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'La foto deve essere inferiore a 10 MB.' }, { status: 413 })
  }

  const normalizedFile = new File([file], file.name || `foto-${Date.now()}.jpg`, {
    type: file.type,
  })
  const saved = await saveCapturedFile(sessionId, normalizedFile)

  if (!saved) {
    return NextResponse.json({ error: 'Una foto è già stata inviata.' }, { status: 409 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const retrievalToken = new URL(request.url).searchParams.get('retrievalToken')
  if (!(await deleteCaptureSession(sessionId, retrievalToken))) {
    return NextResponse.json({ error: 'Accesso non autorizzato.' }, { status: 403 })
  }
  return NextResponse.json({ success: true })
}
