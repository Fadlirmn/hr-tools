import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

const PUBLIC_ROUTES = ['/login', '/invite', '/forgot-password', '/reset-password', '/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))

  // Early exit: no Supabase auth cookie → no session possible
  const hasSbCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  if (!hasSbCookie && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = getAnonKey()

  if (!supabaseUrl || !anonKey) {
    if (isPublic) return NextResponse.next()
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

  let session = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data.session
  } catch {
    session = null
  }

  if (!session) {
    if (isPublic) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login') {
    const role = session.user.user_metadata?.role
    if (role === 'hr' || role === 'dev') return NextResponse.redirect(new URL('/hr/dashboard', request.url))
    if (role === 'candidate') return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
    return response
  }

  const role = session.user.user_metadata?.role
  if (pathname.startsWith('/hr') && role !== 'hr' && role !== 'dev') {
    return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
  }
  if (pathname.startsWith('/candidate') && role !== 'candidate' && role !== 'dev') {
    return NextResponse.redirect(new URL('/hr/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/hr/:path*', '/candidate/:path*', '/login', '/invite/:path*', '/forgot-password', '/reset-password'],
}
