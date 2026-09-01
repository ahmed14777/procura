import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  verifyAdminSessionToken,
  verifyStaffSessionToken,
} from '@/lib/staffAuth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const staffToken = request.cookies.get(STAFF_SESSION_COOKIE)?.value
  const authenticated = await verifyStaffSessionToken(staffToken)

  if (!authenticated) {
    return NextResponse.json(
      { authenticated: false, isAdmin: false },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const isAdmin = await verifyAdminSessionToken(adminToken)

  return NextResponse.json(
    { authenticated: true, isAdmin },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
