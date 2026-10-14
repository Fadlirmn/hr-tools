import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session-token'

const PUBLIC_ROUTES = ['/login', '/invite', '/forgot-password', '/reset-password', '/']

// API routes yang tidak memerlukan session (keamanan dihandle di dalam route itu sendiri)
// invite-candidate WAJIB publik: dibuka kandidat yang belum punya akun/session.
// Kalau tidak, device lain (tanpa cookie login) kena 401 → halaman invite
// selalu "Undangan tidak valid", sementara di browser HR (sudah login) terlihat normal.
const PUBLIC_API_ROUTES = ['/api/claim-invite', '/api/invite-candidate']

const API_UNAUTH = (msg: string, status: number) =>
  NextResponse.json({ error: msg }, { status })

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')
  const isPublic = PUBLIC_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const claims = await verifySessionToken(token)

  if (!claims) {
    if (isPublic || isPublicApi) return NextResponse.next()
    if (isApi) return API_UNAUTH('Unauthorized', 401)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // API routes: just ensure auth; detailed role check done inside each handler
  if (isApi) return NextResponse.next()

  if (pathname === '/login') {
    if (claims.role === 'hr' || claims.role === 'dev') return NextResponse.redirect(new URL('/hr/dashboard', request.url))
    if (claims.role === 'candidate') return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
    return NextResponse.next()
  }

  if (pathname.startsWith('/hr') && claims.role !== 'hr' && claims.role !== 'dev') {
    return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
  }
  if (pathname.startsWith('/candidate') && claims.role !== 'candidate' && claims.role !== 'dev') {
    return NextResponse.redirect(new URL('/hr/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/hr/:path*', '/candidate/:path*', '/login', '/invite/:path*', '/forgot-password', '/reset-password', '/api/:path*'],
}
