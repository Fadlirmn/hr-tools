import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { verifyPassword, setSession } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const cleanEmail = String(email).toLowerCase().trim()
  const res = await query<{ id: string; email: string; password_hash: string; role: UserRole; nama: string }>(
    'SELECT id, email, password_hash, role, nama FROM users WHERE email = $1 LIMIT 1',
    [cleanEmail]
  )

  if (res.rowCount === 0) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const user = res.rows[0]
  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  await setSession(user.id, user.role)
  await query('UPDATE users SET last_sign_in_at = now() WHERE id = $1', [user.id])

  return NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, role: user.role, nama: user.nama },
  })
}
