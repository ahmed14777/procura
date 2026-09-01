import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto'
import { getRedis, hasRedis } from '@/lib/serverStorage'

const LICENSE_INDEX_KEY = 'procura:extension-licenses'
const DAILY_LIMIT = 100

function encryptionKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  return createHash('sha256').update(secret).digest()
}

function encryptToken(token: string) {
  const key = encryptionKey()
  if (!key) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')
}

function decryptToken(encrypted: string) {
  const key = encryptionKey()
  if (!key || !encrypted) return null
  try {
    const raw = Buffer.from(encrypted, 'base64')
    const iv = raw.subarray(0, 12)
    const authTag = raw.subarray(12, 28)
    const ciphertext = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

export interface ExtensionLicense {
  id: string
  name: string
  active: boolean
  createdAt: string
  lastUsedAt: string
  lastStatus: string
  totalUsage: number
  usageToday: number
}

interface StoredLicense extends Omit<ExtensionLicense, 'usageToday'> {
  tokenHash: string
  encryptedToken: string
}

declare global {
  var extensionLicenseStore: Map<string, StoredLicense> | undefined
  var extensionLicenseUsage: Map<string, number> | undefined
}

const localLicenseStore = globalThis.extensionLicenseStore ?? new Map<string, StoredLicense>()
const localLicenseUsage = globalThis.extensionLicenseUsage ?? new Map<string, number>()
globalThis.extensionLicenseStore = localLicenseStore
globalThis.extensionLicenseUsage = localLicenseUsage

function clearLocalUsageForLicense(id: string) {
  const prefix = `procura:extension-usage:${id}:`
  for (const key of localLicenseUsage.keys()) {
    if (key.startsWith(prefix)) {
      localLicenseUsage.delete(key)
    }
  }
}

function licenseKey(id: string) {
  return `procura:extension-license:${id}`
}

function usageKey(id: string, date = new Date()) {
  return `procura:extension-usage:${id}:${date.toISOString().slice(0, 10)}`
}

function secondsUntilNextUtcDay(date = new Date()) {
  const nextDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  return Math.max(1, Math.ceil((nextDay - date.getTime()) / 1000))
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function extractLicenseIdFromToken(token: string | null) {
  const normalizedToken = String(token || '').trim()
  const match = normalizedToken.match(
    /^e2d_([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})_[A-Za-z0-9_-]+$/
  )
  return match?.[1]?.toLowerCase() || null
}

function tokenMatchesHash(token: string, tokenHash: string) {
  const actual = Buffer.from(hashToken(token), 'hex')
  const expected = Buffer.from(tokenHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function parseStoredLicense(value: Record<string, unknown> | null): StoredLicense | null {
  if (!value || typeof value.id !== 'string' || typeof value.tokenHash !== 'string') return null
  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    active: value.active === true || value.active === 'true' || value.active === 1,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    lastUsedAt: typeof value.lastUsedAt === 'string' ? value.lastUsedAt : '',
    lastStatus: typeof value.lastStatus === 'string' ? value.lastStatus : '',
    totalUsage: Number(value.totalUsage) || 0,
    tokenHash: value.tokenHash,
    encryptedToken: typeof value.encryptedToken === 'string' ? value.encryptedToken : '',
  }
}

function toPublicLicense(stored: StoredLicense, usageToday: number): ExtensionLicense {
  return {
    id: stored.id,
    name: stored.name,
    active: stored.active,
    createdAt: stored.createdAt,
    lastUsedAt: stored.lastUsedAt,
    lastStatus: stored.lastStatus,
    totalUsage: stored.totalUsage,
    usageToday,
  }
}

export function extensionLicensesConfigured() {
  return hasRedis() || Boolean(process.env.SESSION_SECRET)
}

export async function createExtensionLicense(name: string) {
  const normalizedName = name.trim()
  if (!normalizedName || normalizedName.length > 80) throw new Error('Nome licenza non valido.')

  const id = randomUUID()
  const token = `e2d_${id}_${randomBytes(24).toString('base64url')}`
  const createdAt = new Date().toISOString()
  const stored: StoredLicense = {
    id,
    name: normalizedName,
    active: true,
    createdAt,
    lastUsedAt: '',
    lastStatus: '',
    totalUsage: 0,
    tokenHash: hashToken(token),
    encryptedToken: encryptToken(token),
  }

  if (hasRedis()) {
    const redis = getRedis()
    await redis.hset(licenseKey(id), stored as unknown as Record<string, unknown>)
    await redis.sadd(LICENSE_INDEX_KEY, id)
  } else {
    localLicenseStore.set(id, stored)
  }

  return { license: toPublicLicense(stored, 0), token }
}

export async function listExtensionLicenses(): Promise<ExtensionLicense[]> {
  if (hasRedis()) {
    const redis = getRedis()
    const ids = await redis.smembers<string[]>(LICENSE_INDEX_KEY)
    const licenses = await Promise.all(
      ids.map(async (id) => {
        const stored = parseStoredLicense(
          await redis.hgetall<Record<string, unknown>>(licenseKey(id))
        )
        if (!stored) return null
        const usageToday = Number(await redis.get<number>(usageKey(id))) || 0
        return toPublicLicense(stored, usageToday)
      })
    )
    return licenses
      .filter((license): license is ExtensionLicense => Boolean(license))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }

  return [...localLicenseStore.values()]
    .map((stored) => {
      const usageToday = localLicenseUsage.get(usageKey(stored.id))
      return toPublicLicense(stored, usageToday || 0)
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function setExtensionLicenseActive(id: string, active: boolean) {
  if (hasRedis()) {
    const redis = getRedis()
    const stored = parseStoredLicense(await redis.hgetall<Record<string, unknown>>(licenseKey(id)))
    if (!stored) return false
    await redis.hset(licenseKey(id), { active })
    return true
  }

  const stored = localLicenseStore.get(id)
  if (!stored) return false
  stored.active = active
  return true
}

export async function updateExtensionLicenseName(id: string, name: string) {
  const normalizedName = name.trim()
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error('Nome licenza non valido.')
  }

  if (hasRedis()) {
    const redis = getRedis()
    const stored = parseStoredLicense(await redis.hgetall<Record<string, unknown>>(licenseKey(id)))
    if (!stored) return false
    await redis.hset(licenseKey(id), { name: normalizedName })
    return true
  }

  const stored = localLicenseStore.get(id)
  if (!stored) return false
  stored.name = normalizedName
  return true
}

export async function deleteExtensionLicense(id: string) {
  if (hasRedis()) {
    const redis = getRedis()
    const stored = parseStoredLicense(await redis.hgetall<Record<string, unknown>>(licenseKey(id)))
    if (!stored) return false
    await redis.del(licenseKey(id))
    await redis.srem(LICENSE_INDEX_KEY, id)
    await redis.del(usageKey(id))
    return true
  }

  const deleted = localLicenseStore.delete(id)
  if (!deleted) return false
  clearLocalUsageForLicense(id)
  return true
}

export type LicenseVerification =
  | { ok: true; licenseId: string; name: string; remaining: number }
  | { ok: false; status: 401 | 429 | 503; error: string; retryAfterSeconds?: number }

export type LicenseTokenVerification =
  | { ok: true; licenseId: string; name: string; usageToday: number; remaining: number }
  | { ok: false; status: 401 | 503; error: string }

async function findStoredLicenseByToken(
  token: string,
  preferredLicenseId: string | null
): Promise<StoredLicense | null> {
  if (hasRedis()) {
    const redis = getRedis()

    if (preferredLicenseId) {
      const preferred = parseStoredLicense(
        await redis.hgetall<Record<string, unknown>>(licenseKey(preferredLicenseId))
      )
      if (preferred && tokenMatchesHash(token, preferred.tokenHash)) {
        return preferred
      }
    }

    const ids = await redis.smembers<string[]>(LICENSE_INDEX_KEY)
    for (const id of ids) {
      if (preferredLicenseId && id === preferredLicenseId) continue
      const stored = parseStoredLicense(await redis.hgetall<Record<string, unknown>>(licenseKey(id)))
      if (stored && tokenMatchesHash(token, stored.tokenHash)) {
        return stored
      }
    }
    return null
  }

  if (preferredLicenseId) {
    const preferred = localLicenseStore.get(preferredLicenseId)
    if (preferred && tokenMatchesHash(token, preferred.tokenHash)) {
      return preferred
    }
  }

  for (const stored of localLicenseStore.values()) {
    if (preferredLicenseId && stored.id === preferredLicenseId) continue
    if (tokenMatchesHash(token, stored.tokenHash)) {
      return stored
    }
  }

  return null
}

export async function verifyExtensionLicenseToken(
  token: string | null
): Promise<LicenseTokenVerification> {
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) {
    return { ok: false, status: 401, error: 'Licenza non valida.' }
  }

  const licenseId = extractLicenseIdFromToken(normalizedToken)
  const stored = await findStoredLicenseByToken(normalizedToken, licenseId)
  if (!stored || !stored.active) {
    return { ok: false, status: 401, error: 'Licenza non valida o disattivata.' }
  }

  if (hasRedis()) {
    const usageToday = Number(await getRedis().get<number>(usageKey(stored.id))) || 0
    return {
      ok: true,
      licenseId: stored.id,
      name: stored.name,
      usageToday,
      remaining: Math.max(0, DAILY_LIMIT - usageToday),
    }
  }

  const usageToday = localLicenseUsage.get(usageKey(stored.id)) || 0
  return {
    ok: true,
    licenseId: stored.id,
    name: stored.name,
    usageToday,
    remaining: Math.max(0, DAILY_LIMIT - usageToday),
  }
}

export async function verifyAndConsumeExtensionLicense(
  token: string | null
): Promise<LicenseVerification> {
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) return { ok: false, status: 401, error: 'Licenza non valida.' }

  const licenseId = extractLicenseIdFromToken(normalizedToken)
  const stored = await findStoredLicenseByToken(normalizedToken, licenseId)
  if (!stored || !stored.active) {
    return { ok: false, status: 401, error: 'Licenza non valida o disattivata.' }
  }

  if (hasRedis()) {
    const redis = getRedis()
    const key = usageKey(stored.id)
    const usage = await redis.incr(key)
    if (usage === 1) await redis.expire(key, 2 * 24 * 60 * 60)
    if (usage > DAILY_LIMIT) {
      await redis.hset(licenseKey(stored.id), {
        lastUsedAt: new Date().toISOString(),
        lastStatus: 'daily_limit',
      })
      return {
        ok: false,
        status: 429,
        error: 'Limite giornaliero di 100 documenti raggiunto.',
        retryAfterSeconds: secondsUntilNextUtcDay(),
      }
    }

    await redis.hincrby(licenseKey(stored.id), 'totalUsage', 1)
    await redis.hset(licenseKey(stored.id), {
      lastUsedAt: new Date().toISOString(),
      lastStatus: 'accepted',
    })
    return { ok: true, licenseId: stored.id, name: stored.name, remaining: DAILY_LIMIT - usage }
  }

  const key = usageKey(stored.id)
  const usage = (localLicenseUsage.get(key) || 0) + 1
  localLicenseUsage.set(key, usage)

  if (usage > DAILY_LIMIT) {
    stored.lastUsedAt = new Date().toISOString()
    stored.lastStatus = 'daily_limit'
    return {
      ok: false,
      status: 429,
      error: 'Limite giornaliero di 100 documenti raggiunto.',
      retryAfterSeconds: secondsUntilNextUtcDay(),
    }
  }

  stored.totalUsage += 1
  stored.lastUsedAt = new Date().toISOString()
  stored.lastStatus = 'accepted'

  return { ok: true, licenseId: stored.id, name: stored.name, remaining: DAILY_LIMIT - usage }
}

export async function revealExtensionLicenseToken(id: string) {
  const stored = hasRedis()
    ? parseStoredLicense(await getRedis().hgetall<Record<string, unknown>>(licenseKey(id)))
    : localLicenseStore.get(id)
  if (!stored) return null
  const token = decryptToken(stored.encryptedToken)
  if (!token) throw new Error('Impossibile decifrare il codice. Contatta l’amministratore.')
  return token
}

export async function recordExtensionLicenseStatus(id: string, status: 'success' | 'error') {
  if (hasRedis()) {
    await getRedis().hset(licenseKey(id), {
      lastUsedAt: new Date().toISOString(),
      lastStatus: status,
    })
    return
  }

  const stored = localLicenseStore.get(id)
  if (!stored) return
  stored.lastUsedAt = new Date().toISOString()
  stored.lastStatus = status
}
