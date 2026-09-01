import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, STAFF_SESSION_COOKIE } from '@/lib/staffAuth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(STAFF_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
