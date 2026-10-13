import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email'

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

  const { candidateId, type } = await req.json() as { candidateId: string; type?: 'disc' | 'iq' }
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
    .select('email, nama')
    .eq('id', candidateId)
    .single()

  if (!candidate?.email) {
    return NextResponse.json({ error: 'Candidate has no email' }, { status: 400 })
  }

  const appUrl = process.env.VERCEL_URL || 'localhost:3000'
  const testLabel = type === 'disc' ? 'Tes DISC' : type === 'iq' ? 'Tes IQ' : 'Psikotes'
  const loginUrl = `https://${appUrl}/candidate/psikotes`

  try {
    await sendEmail({
      to: candidate.email,
      subject: `${testLabel} Telah Dibuka — Segera Kerjakan`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>${testLabel} Dibuka</h2>
        <p>Halo <b>${candidate.nama}</b>,</p>
        <p>Akses ${testLabel} Anda telah dibuka oleh HR. Silakan kerjakan tes berikut:</p>
        <div style="margin:20px 0;text-align:center">
          <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#7c5bfe;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Mulai ${testLabel}</a>
        </div>
        <p style="color:#666;font-size:12px">Link ini akan kedaluwarsa sesuai batas waktu yang ditentukan HR.</p>
      </div>`,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true, note: 'Email not sent via SMTP; ensure Supabase SMTP is configured in project settings' })
  }
}
