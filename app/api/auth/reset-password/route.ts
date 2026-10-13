import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { hashPassword } from '@/lib/auth'

// POST /api/auth/reset-password — konsumsi token dari email, set password baru.
export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}))
  if (!token || !password) {
    return NextResponse.json({ error: 'Token dan password wajib diisi' }, { status: 400 })
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const tokenRes = await query<{ user_id: string; expires_at: string; used: boolean }>(
    'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1 LIMIT 1',
    [token]
  )
  const row = tokenRes.rows[0]

  if (!row || row.used || new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link reset password tidak valid atau sudah kedaluwarsa' }, { status: 400 })
  }

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(password), row.user_id])
  await query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token])

  return NextResponse.json({ success: true })
}
