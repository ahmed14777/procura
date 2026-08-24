import { createHash, randomBytes } from 'crypto'
import { del, get, put } from '@vercel/blob'
import { getRedis, hasRemoteStorage } from '@/lib/serverStorage'
import {
  cleanupExpiredBlobs,
  registerBlobForCleanup,
  unregisterBlobFromCleanup,
} from '@/lib/blobCleanup'

const SESSION_LIFETIME_SECONDS = 10 * 60

interface SignatureSession {
  clientName: string
  expiresAt: number
  retrievalTokenHash: string
  submitTokenHash: string
  document?: Buffer
  documentUrl?: string
  signature?: string
  signatureUrl?: string
}

declare global {
  var signatureSessions: Map<string, SignatureSession> | undefined
}

const localSessions = globalThis.signatureSessions ?? new Map<string, SignatureSession>()
globalThis.signatureSessions = localSessions
const key = (id: string) => `procura:signature:${id}`
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createSignatureSession(clientName: string, document: File) {
  await cleanupExpiredBlobs()
  const id = randomBytes(24).toString('base64url')
  const retrievalToken = randomBytes(24).toString('base64url')
  const submitToken = randomBytes(24).toString('base64url')
  const expiresAt = Date.now() + SESSION_LIFETIME_SECONDS * 1000
  const baseSession = {
    clientName,
    expiresAt,
    retrievalTokenHash: hashToken(retrievalToken),
    submitTokenHash: hashToken(submitToken),
  }

  if (hasRemoteStorage()) {
    const blob = await put(`signature/${id}/procura.pdf`, document, {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: true,
    })
    await registerBlobForCleanup(blob.url, expiresAt)
    await getRedis().set(
      key(id),
      { ...baseSession, documentUrl: blob.url },
      {
        ex: SESSION_LIFETIME_SECONDS,
      }
    )
  } else {
    localSessions.set(id, {
      ...baseSession,
      document: Buffer.from(await document.arrayBuffer()),
    })
  }
  return { id, expiresAt, retrievalToken, submitToken }
}

export async function getSignatureSession(id: string) {
  if (hasRemoteStorage()) return getRedis().get<SignatureSession>(key(id))
  const session = localSessions.get(id)
  if (session && session.expiresAt <= Date.now()) {
    localSessions.delete(id)
    return undefined
  }
  return session
}

export async function saveSignature(id: string, signature: string) {
  const session = await getSignatureSession(id)
  if (!session || session.signature || session.signatureUrl) return false

  if (hasRemoteStorage()) {
    const bytes = Buffer.from(signature.slice('data:image/png;base64,'.length), 'base64')
    const blob = await put(`signature/${id}/signature.png`, bytes, {
      access: 'private',
      contentType: 'image/png',
      addRandomSuffix: true,
    })
    await registerBlobForCleanup(blob.url, session.expiresAt)
    const ttl = Math.max(1, Math.ceil((session.expiresAt - Date.now()) / 1000))
    await getRedis().set(key(id), { ...session, signatureUrl: blob.url }, { ex: ttl })
  } else {
    session.signature = signature
  }
  return true
}

export function canSubmitSignature(
  session: { submitTokenHash: string },
  submitToken: string | null
) {
  return Boolean(submitToken && hashToken(submitToken) === session.submitTokenHash)
}

export async function consumeSignature(id: string, retrievalToken: string | null) {
  const session = await getSignatureSession(id)
  if (!session || !retrievalToken || hashToken(retrievalToken) !== session.retrievalTokenHash) {
    return null
  }

  let signature = session.signature ?? null
  if (session.signatureUrl) {
    const blob = await get(session.signatureUrl, { access: 'private', useCache: false })
    if (!blob || blob.statusCode !== 200 || !blob.stream) return null
    const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer())
    signature = `data:image/png;base64,${bytes.toString('base64')}`
  }
  if (!signature) return null

  return signature
}

export async function deleteSignatureSession(id: string, retrievalToken: string | null) {
  const session = await getSignatureSession(id)
  if (!session || !retrievalToken || hashToken(retrievalToken) !== session.retrievalTokenHash) {
    return false
  }
  if (hasRemoteStorage()) {
    const blobUrls = [session.documentUrl, session.signatureUrl].filter(Boolean) as string[]
    await getRedis().del(key(id))
    if (blobUrls.length) {
      await del(blobUrls)
      await unregisterBlobFromCleanup(blobUrls)
    }
  } else {
    localSessions.delete(id)
  }
  return true
}

export async function getSignatureDocument(session: SignatureSession) {
  if (session.documentUrl) {
    return get(session.documentUrl, { access: 'private', useCache: false })
  }
  return session.document
}
