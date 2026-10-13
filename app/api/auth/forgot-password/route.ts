import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { query } from '@/lib/pg'
import { sendEmail } from '@/lib/email'

const RATE_LIMIT = 5
const RATE_WINDOW = 120000
const hitCount = new Map<string, { n: number; reset: number }>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = hitCount.get(key)
  if (!entry || now > entry.reset) {
    hitCount.set(key, { n: 1, reset: now + RATE_WINDOW })
    return true
  }
  if (entry.n >= RATE_LIMIT) return false
  entry.n++
  return true
}

// POST /api/auth/forgot-password — kirim link reset password via email.
// Selalu balas sukses (tidak membedakan email ada/tidak) untuk mencegah
// enumeration — sama seperti behavior Supabase resetPasswordForEmail lama.
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })

  if (!checkRateLimit(String(email).toLowerCase())) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Tunggu 2 menit sebelum mencoba lagi.' }, { status: 429 })
  }
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Tunggu 2 menit sebelum mencoba lagi.' }, { status: 429 })
  }

  const cleanEmail = String(email).trim().toLowerCase()
  const userRes = await query<{ id: string; nama: string }>('SELECT id, nama FROM users WHERE email = $1 LIMIT 1', [cleanEmail])
  const user = userRes.rows[0]

  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 jam
    await query(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, user.id, expiresAt]
    )

    const appUrl = process.env.APP_URL || `http://localhost:3000`
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    try {
      await sendEmail({
        to: cleanEmail,
        subject: 'Reset Password — HR Recruitment Toolkit',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Reset Password</h2>
          <p>Halo${user.nama ? ` <b>${user.nama}</b>` : ''},</p>
          <p>Klik tombol di bawah untuk membuat password baru. Link berlaku 1 jam.</p>
          <div style="margin:20px 0;text-align:center">
            <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#7c5bfe;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Reset Password</a>
          </div>
          <p style="color:#666;font-size:12px">Jika Anda tidak meminta ini, abaikan email ini.</p>
        </div>`,
      })
    } catch (err) {
      console.error('[forgot-password] gagal kirim email:', err)
      // Tetap balas sukses — jangan bocorkan status pengiriman ke caller
    }
  }

  return NextResponse.json({ success: true })
}
