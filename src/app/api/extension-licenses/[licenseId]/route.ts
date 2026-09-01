import { NextResponse } from 'next/server'
import { deleteExtensionLicense, setExtensionLicenseActive } from '@/lib/extensionLicenses'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  try {
    const { licenseId } = await params
    const body = (await request.json()) as { active?: unknown }
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Stato non valido.' }, { status: 400 })
    }
    const updated = await setExtensionLicenseActive(licenseId, body.active)
    return updated
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'Licenza non trovata.' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Impossibile aggiornare la licenza.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  try {
    const { licenseId } = await params
    const deleted = await deleteExtensionLicense(licenseId)
    return deleted
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'Licenza non trovata.' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Impossibile eliminare la licenza.' }, { status: 500 })
  }
}
