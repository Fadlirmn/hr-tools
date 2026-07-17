import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const publicPaths = ['/login', '/invite', '/']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && pathname === '/login') {
    const role = session.user.user_metadata?.role
    if (role === 'hr' || role === 'dev') return NextResponse.redirect(new URL('/hr/dashboard', request.url))
    if (role === 'candidate') return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
  }

  if (session && !isPublic) {
    const role = session.user.user_metadata?.role
    if (pathname.startsWith('/hr') && role !== 'hr' && role !== 'dev') {
      return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
    }
    if (pathname.startsWith('/candidate') && role !== 'candidate' && role !== 'dev') {
      return NextResponse.redirect(new URL('/hr/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
