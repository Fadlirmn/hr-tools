import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser, hashPassword } from '@/lib/auth'

// POST /api/auth/change-password — ubah password user yang login
// Body: { password: string } (tanpa oldPassword — konsisten dengan behavior
// Supabase auth.updateUser lama yang tidak minta password lama saat sudah login).
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await req.json().catch(() => ({}))
  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const hash = hashPassword(password)
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id])

  return NextResponse.json({ success: true })
}
