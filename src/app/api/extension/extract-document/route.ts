import { NextResponse } from 'next/server'
import { extractDocumentData } from '@/lib/documentExtraction'
import {
  recordExtensionLicenseStatus,
  verifyAndConsumeExtensionLicense,
} from '@/lib/extensionLicenses'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const token =
    request.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim() || null
  const verification = await verifyAndConsumeExtensionLicense(token)
  if (!verification.ok) {
    return NextResponse.json(
      { error: verification.error },
      {
        status: verification.status,
        headers: {
          'Cache-Control': 'no-store',
          ...(verification.retryAfterSeconds
            ? { 'Retry-After': String(verification.retryAfterSeconds) }
            : {}),
        },
      }
    )
  }

  const response = await extractDocumentData(request)
  await recordExtensionLicenseStatus(verification.licenseId, response.ok ? 'success' : 'error')
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Easy2Do-Remaining', String(verification.remaining))
  return response
}
