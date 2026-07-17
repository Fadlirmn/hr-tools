import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const RATE_LIMIT = 10
const RATE_WINDOW = 60000
const hitCount = new Map<string, { n: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = hitCount.get(ip)
  if (!entry || now > entry.reset) {
    hitCount.set(ip, { n: 1, reset: now + RATE_WINDOW })
    return true
  }
  if (entry.n >= RATE_LIMIT) return false
  entry.n++
  return true
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.user_metadata?.role
  if (role !== 'hr' && role !== 'dev') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { candidateId } = await req.json()
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: candidate } = await admin
    .from('candidates')
    .select('user_id')
    .eq('id', candidateId)
    .single()

  const userId = candidate?.user_id

  if (userId) {
    await admin.auth.admin.deleteUser(userId)
  }

  const { error: dbErr } = await admin.from('candidates').delete().eq('id', candidateId)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
