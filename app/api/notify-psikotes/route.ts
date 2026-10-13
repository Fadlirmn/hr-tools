import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
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

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'hr' && user.role !== 'dev') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { candidateId, type } = await req.json() as { candidateId: string; type?: 'disc' | 'iq' }
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const candRes = await query<{ email: string; nama: string }>(
    'SELECT email, nama FROM candidates WHERE id = $1 LIMIT 1',
    [candidateId]
  )
  const candidate = candRes.rows[0]

  if (!candidate?.email) {
    return NextResponse.json({ error: 'Candidate has no email' }, { status: 400 })
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const testLabel = type === 'disc' ? 'Tes DISC' : type === 'iq' ? 'Tes IQ' : 'Psikotes'
  const testPath = type === 'disc' ? 'tes-disc' : type === 'iq' ? 'tes-iq' : 'tes-disc'
  const loginUrl = `${appUrl}/candidate/${testPath}`

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
    return NextResponse.json({ ok: true, note: 'Email gagal terkirim, silakan cek konfigurasi layanan email.' })
  }
}
