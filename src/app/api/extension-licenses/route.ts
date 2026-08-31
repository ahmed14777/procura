import { NextResponse } from 'next/server'
import {
  createExtensionLicense,
  extensionLicensesConfigured,
  listExtensionLicenses,
} from '@/lib/extensionLicenses'

export const runtime = 'nodejs'

export async function GET() {
  if (!extensionLicensesConfigured()) {
    return NextResponse.json({ error: 'Redis non configurato.' }, { status: 503 })
  }
  return NextResponse.json(
    { licenses: await listExtensionLicenses() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown }
    const name = typeof body.name === 'string' ? body.name : ''
    const created = await createExtensionLicense(name)
    return NextResponse.json(created, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossibile creare la licenza.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
