import { NextResponse } from 'next/server'
import { revealExtensionLicenseToken } from '@/lib/extensionLicenses'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  try {
    const { licenseId } = await params
    const token = await revealExtensionLicenseToken(licenseId)
    if (!token) {
      return NextResponse.json({ error: 'Licenza non trovata.' }, { status: 404 })
    }
    return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossibile recuperare il codice.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
