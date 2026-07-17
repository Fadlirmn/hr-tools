import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getAnonKey(),
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const publicPaths = ['/login', '/invite', '/']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const role = user.user_metadata?.role
    if (role === 'hr' || role === 'dev') {
      return NextResponse.redirect(new URL('/hr/dashboard', request.url))
    }
    if (role === 'candidate') {
      return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
    }
  }

  if (user && !isPublic) {
    const role = user.user_metadata?.role
    if (pathname.startsWith('/hr') && role !== 'hr' && role !== 'dev') {
      return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
    }
    if (pathname.startsWith('/candidate') && role !== 'candidate' && role !== 'dev') {
      return NextResponse.redirect(new URL('/hr/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
