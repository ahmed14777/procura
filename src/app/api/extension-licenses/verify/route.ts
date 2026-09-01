import { NextResponse } from 'next/server'
import { verifyExtensionLicenseToken } from '@/lib/extensionLicenses'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown }
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!token) {
      return NextResponse.json({ error: 'Codice non valido.' }, { status: 400 })
    }

    const verification = await verifyExtensionLicenseToken(token)
    if (!verification.ok) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      {
        valid: true,
        licenseId: verification.licenseId,
        name: verification.name,
        usageToday: verification.usageToday,
        remaining: verification.remaining,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossibile verificare il codice.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
