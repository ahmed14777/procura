import { NextResponse } from 'next/server'
import {
  deleteExtensionLicense,
  setExtensionLicenseActive,
  updateExtensionLicenseName,
} from '@/lib/extensionLicenses'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  try {
    const { licenseId } = await params
    const body = (await request.json()) as { active?: unknown; name?: unknown }

    if (typeof body.active === 'boolean') {
      const updated = await setExtensionLicenseActive(licenseId, body.active)
      return updated
        ? NextResponse.json({ success: true })
        : NextResponse.json({ error: 'Licenza non trovata.' }, { status: 404 })
    }

    if (typeof body.name === 'string') {
      const updated = await updateExtensionLicenseName(licenseId, body.name)
      return updated
        ? NextResponse.json({ success: true })
        : NextResponse.json({ error: 'Licenza non trovata.' }, { status: 404 })
    }

    if (typeof body.active !== 'boolean' && typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Dati non validi.' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossibile aggiornare la licenza.'
    const status = message === 'Nome licenza non valido.' ? 400 : 500
    return NextResponse.json({ error: message }, { status })
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
