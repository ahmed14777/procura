import { createHash } from 'crypto'
import { getRedis, hasRedis } from '@/lib/serverStorage'

interface RateLimitState {
  count: number
  resetAt: number
}

interface ConsumeRateLimitOptions {
  request: Request
  bucket: string
  limit: number
  windowSeconds: number
}

interface ConsumeRateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  limit: number
}

declare global {
  var rateLimitState: Map<string, RateLimitState> | undefined
}

const localRateLimitState = globalThis.rateLimitState ?? new Map<string, RateLimitState>()
globalThis.rateLimitState = localRateLimitState

function requestIdentifier(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const sourceIp = forwarded || request.headers.get('x-real-ip') || 'local'
  const secret = process.env.SESSION_SECRET || 'local'
  return createHash('sha256').update(`${secret}:${sourceIp}`).digest('hex').slice(0, 40)
}

export async function consumeRateLimit({
  request,
  bucket,
  limit,
  windowSeconds,
}: ConsumeRateLimitOptions): Promise<ConsumeRateLimitResult> {
  const identifier = requestIdentifier(request)
  const key = `procura:rate-limit:${bucket}:${identifier}`

  if (hasRedis()) {
    const redis = getRedis()
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }

    const ttlRaw = await redis.ttl(key)
    const retryAfterSeconds = typeof ttlRaw === 'number' && ttlRaw > 0 ? ttlRaw : windowSeconds

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds,
      limit,
    }
  }

  const now = Date.now()
  const current = localRateLimitState.get(key)
  const resetAt = now + windowSeconds * 1000

  if (!current || current.resetAt <= now) {
    localRateLimitState.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: windowSeconds,
      limit,
    }
  }

  current.count += 1
  localRateLimitState.set(key, current)

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    limit,
  }
}
