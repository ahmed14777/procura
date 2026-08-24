import { NextRequest, NextResponse } from 'next/server'
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken } from '@/lib/staffAuth'

function isPublicPage(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/client' ||
    pathname === '/success' ||
    pathname.startsWith('/sign/') ||
    pathname.startsWith('/capture/')
  )
}

function isProtectedRequest(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/api/')) {
    return (
      request.method === 'POST' &&
      (pathname === '/api/capture-sessions' || pathname === '/api/signature-sessions')
    )
  }
  return !isPublicPage(pathname)
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value
  const authenticated = await verifyStaffSessionToken(token)

  if (request.nextUrl.pathname === '/login' && authenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (!isProtectedRequest(request) || authenticated) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Accesso dipendenti richiesto.' }, { status: 401 })
  }

  const homeUrl = new URL('/', request.url)
  homeUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(homeUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)',
  ],
}
