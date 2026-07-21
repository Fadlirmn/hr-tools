import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

const PUBLIC_ROUTES = ['/login', '/invite', '/forgot-password', '/reset-password', '/']

// API routes yang tidak memerlukan session (keamanan dihandle di dalam route itu sendiri)
const PUBLIC_API_ROUTES = ['/api/claim-invite']

const API_UNAUTH = (msg: string, status: number) =>
  NextResponse.json({ error: msg }, { status })

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')
  const isPublic = PUBLIC_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = getAnonKey()
  if (!supabaseUrl || !anonKey) {
    return isPublic || isApi ? NextResponse.next() : NextResponse.redirect(new URL('/login', request.url))
  }

  const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  const hasSbCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  if (!hasSbCookie) {
    if (isPublic || isPublicApi) return NextResponse.next()
    if (isApi) return API_UNAUTH('Unauthorized', 401)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() memvalidasi JWT ke Supabase server (aman), bukan hanya baca cookie lokal
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch { user = null }

  if (!user) {
    if (isPublic || isPublicApi) return response
    if (isApi) return API_UNAUTH('Unauthorized', 401)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // API routes: just ensure auth; role check done inside each handler
  if (isApi) return response

  if (pathname === '/login') {
    const role = user.user_metadata?.role
    if (role === 'hr' || role === 'dev') return NextResponse.redirect(new URL('/hr/dashboard', request.url))
    if (role === 'candidate') return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
    return response
  }

  const role = user.user_metadata?.role
  if (pathname.startsWith('/hr') && role !== 'hr' && role !== 'dev') {
    return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
  }
  if (pathname.startsWith('/candidate') && role !== 'candidate' && role !== 'dev') {
    return NextResponse.redirect(new URL('/hr/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/hr/:path*', '/candidate/:path*', '/login', '/invite/:path*', '/forgot-password', '/reset-password', '/api/:path*'],
}
