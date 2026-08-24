import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import {
  createStaffSessionToken,
  isStaffAuthConfigured,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_SECONDS,
} from '@/lib/staffAuth'
import { getRedis, hasRedis } from '@/lib/serverStorage'

export const runtime = 'nodejs'

const MAX_ATTEMPTS = 5
const BLOCK_SECONDS = 15 * 60

declare global {
  var staffLoginAttempts: Map<string, { count: number; expiresAt: number }> | undefined
}

const localAttempts = globalThis.staffLoginAttempts ?? new Map()
globalThis.staffLoginAttempts = localAttempts

function requestIdentifier(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const source = forwarded || request.headers.get('x-real-ip') || 'local'
  const secret = process.env.SESSION_SECRET || 'local'
  return createHash('sha256').update(`${secret}:${source}`).digest('hex').slice(0, 32)
}

function passwordMatches(value: string, expected: string) {
  const actualHash = createHash('sha256').update(value).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(actualHash, expectedHash)
}

async function attemptCount(identifier: string) {
  if (hasRedis()) return (await getRedis().get<number>(`procura:staff-login:${identifier}`)) || 0
  const entry = localAttempts.get(identifier)
  if (!entry || entry.expiresAt <= Date.now()) {
    localAttempts.delete(identifier)
    return 0
  }
  return entry.count
}

async function recordFailure(identifier: string) {
  if (hasRedis()) {
    const key = `procura:staff-login:${identifier}`
    const count = await getRedis().incr(key)
    if (count === 1) await getRedis().expire(key, BLOCK_SECONDS)
    return count
  }
  const count = (await attemptCount(identifier)) + 1
  localAttempts.set(identifier, { count, expiresAt: Date.now() + BLOCK_SECONDS * 1000 })
  return count
}

async function clearFailures(identifier: string) {
  if (hasRedis()) await getRedis().del(`procura:staff-login:${identifier}`)
  else localAttempts.delete(identifier)
}

export async function POST(request: Request) {
  if (!isStaffAuthConfigured()) {
    return NextResponse.json(
      { error: 'Accesso dipendenti non configurato sul server.' },
      { status: 503 }
    )
  }

  const identifier = requestIdentifier(request)
  if ((await attemptCount(identifier)) >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Troppi tentativi. Riprova tra 15 minuti.' }, { status: 429 })
  }

  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  if (
    !password ||
    password.length > 200 ||
    !passwordMatches(password, process.env.STAFF_ACCESS_PASSWORD!)
  ) {
    const failures = await recordFailure(identifier)
    const remaining = Math.max(0, MAX_ATTEMPTS - failures)
    return NextResponse.json(
      {
        error: remaining
          ? `Password errata. Tentativi rimasti: ${remaining}.`
          : 'Troppi tentativi. Riprova tra 15 minuti.',
      },
      { status: failures >= MAX_ATTEMPTS ? 429 : 401 }
    )
  }

  await clearFailures(identifier)
  const response = NextResponse.json({ success: true })
  response.cookies.set(STAFF_SESSION_COOKIE, await createStaffSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STAFF_SESSION_SECONDS,
  })
  return response
}
