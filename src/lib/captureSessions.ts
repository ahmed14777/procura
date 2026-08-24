import { createHash, randomBytes } from 'crypto'
import { del, get, put } from '@vercel/blob'
import { getRedis, hasRemoteStorage } from '@/lib/serverStorage'
import {
  cleanupExpiredBlobs,
  registerBlobForCleanup,
  unregisterBlobFromCleanup,
} from '@/lib/blobCleanup'

const SESSION_LIFETIME_SECONDS = 10 * 60

export interface CapturedFile {
  dataUrl: string
  name: string
  type: string
}

export interface CaptureSession {
  expiresAt: number
  retrievalTokenHash: string
  file?: CapturedFile
  storedFile?: { blobUrl: string; name: string; type: string }
}

declare global {
  var captureSessions: Map<string, CaptureSession> | undefined
}

const localSessions = globalThis.captureSessions ?? new Map<string, CaptureSession>()
globalThis.captureSessions = localSessions
const key = (id: string) => `procura:capture:${id}`
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createCaptureSession() {
  await cleanupExpiredBlobs()
  const id = randomBytes(24).toString('base64url')
  const retrievalToken = randomBytes(24).toString('base64url')
  const expiresAt = Date.now() + SESSION_LIFETIME_SECONDS * 1000
  const session = { expiresAt, retrievalTokenHash: hashToken(retrievalToken) }
  if (hasRemoteStorage()) {
    await getRedis().set(key(id), session, { ex: SESSION_LIFETIME_SECONDS })
  } else {
    localSessions.set(id, session)
  }
  return { id, expiresAt, retrievalToken }
}

export async function getCaptureSession(id: string) {
  if (hasRemoteStorage()) return getRedis().get<CaptureSession>(key(id))
  const session = localSessions.get(id)
  if (session && session.expiresAt <= Date.now()) {
    localSessions.delete(id)
    return undefined
  }
  return session
}

export async function saveCapturedFile(id: string, file: File) {
  const session = await getCaptureSession(id)
  if (!session || session.file || session.storedFile) return false

  if (hasRemoteStorage()) {
    const blob = await put(`capture/${id}/${file.name || 'photo.jpg'}`, file, {
      access: 'private',
      contentType: file.type,
      addRandomSuffix: true,
    })
    const storedFile = { blobUrl: blob.url, name: file.name, type: file.type }
    await registerBlobForCleanup(blob.url, session.expiresAt)
    const ttl = Math.max(1, Math.ceil((session.expiresAt - Date.now()) / 1000))
    await getRedis().set(key(id), { ...session, storedFile }, { ex: ttl })
    return true
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  session.file = {
    dataUrl: `data:${file.type};base64,${base64}`,
    name: file.name,
    type: file.type,
  }
  return true
}

export async function consumeCapturedFile(id: string) {
  const session = await getCaptureSession(id)
  if (!session) return null

  if (session.storedFile) {
    const blob = await get(session.storedFile.blobUrl, { access: 'private', useCache: false })
    if (!blob || blob.statusCode !== 200 || !blob.stream) return null
    const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer())
    const file: CapturedFile = {
      dataUrl: `data:${session.storedFile.type};base64,${bytes.toString('base64')}`,
      name: session.storedFile.name,
      type: session.storedFile.type,
    }
    return file
  }

  if (!session.file) return null
  return session.file
}

export function getCaptureFileMetadata(session: CaptureSession) {
  if (session.storedFile) {
    return { name: session.storedFile.name, type: session.storedFile.type }
  }
  if (session.file) return { name: session.file.name, type: session.file.type }
  return null
}

export async function getCapturedFileContent(session: CaptureSession) {
  if (session.storedFile) {
    return get(session.storedFile.blobUrl, { access: 'private', useCache: false })
  }
  if (!session.file) return null
  return Buffer.from(session.file.dataUrl.split(',', 2)[1] || '', 'base64')
}

export function canRetrieveCapture(session: CaptureSession, retrievalToken: string | null) {
  return Boolean(retrievalToken && hashToken(retrievalToken) === session.retrievalTokenHash)
}

export async function deleteCaptureSession(id: string, retrievalToken: string | null) {
  const session = await getCaptureSession(id)
  if (!session || !canRetrieveCapture(session, retrievalToken)) return false
  if (hasRemoteStorage()) {
    await getRedis().del(key(id))
    if (session.storedFile?.blobUrl) {
      await del(session.storedFile.blobUrl)
      await unregisterBlobFromCleanup([session.storedFile.blobUrl])
    }
  } else {
    localSessions.delete(id)
  }
  return true
}
