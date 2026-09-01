import { NextResponse } from 'next/server'
import { verifyExtensionLicenseToken } from '@/lib/extensionLicenses'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const token =
    request.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim() || null

  const verification = await verifyExtensionLicenseToken(token)
  if (!verification.ok) {
    return NextResponse.json(
      { error: verification.error },
      {
        status: verification.status,
        headers: { 'Cache-Control': 'no-store' },
      }
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
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Easy2Do-Remaining': String(verification.remaining),
      },
    }
  )
}
