import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser, hashPassword } from '@/lib/auth'

async function verifyDev() {
  const user = await getSessionUser()
  if (!user || user.role !== 'dev') return null
  return user
}

// GET /api/manage-user — list all users
export async function GET() {
  const user = await verifyDev()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const res = await query(
    `SELECT id, email, role, nama, created_at, last_sign_in_at FROM users ORDER BY created_at DESC`
  )
  return NextResponse.json({ users: res.rows })
}

// POST /api/manage-user — update role (and optionally nama + password) for a user
export async function POST(req: Request) {
  const user = await verifyDev()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, role, nama, password } = body as { userId: string; role: string; nama?: string; password?: string }

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  const allowed = ['hr', 'dev', 'candidate']
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Password opsional: kosong = tidak diubah. Jika diisi minimal 6 karakter.
  if (password !== undefined && password !== null && String(password) !== '') {
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }
    await query(
      `UPDATE users SET role = $1, nama = COALESCE($2, nama), password_hash = $3 WHERE id = $4`,
      [role, nama, hashPassword(String(password)), userId]
    )
  } else {
    await query(
      `UPDATE users SET role = $1, nama = COALESCE($2, nama) WHERE id = $3`,
      [role, nama, userId]
    )
  }

  return NextResponse.json({ ok: true })
}

// PUT /api/manage-user — tambah user baru (dev only)
// Body: { email, password, role, nama? }
export async function PUT(req: Request) {
  const user = await verifyDev()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const { email, password, role, nama } = body as {
    email?: string
    password?: string
    role?: string
    nama?: string
  }

  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 })
  }
  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const allowed = ['hr', 'dev', 'candidate']
  if (!role || !allowed.includes(role)) {
    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
  }

  const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [cleanEmail])
  if ((existing.rowCount ?? 0) > 0) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
  }

  const res = await query(
    `INSERT INTO users (email, password_hash, role, nama) VALUES ($1, $2, $3, $4) RETURNING id, email, role, nama, created_at, last_sign_in_at`,
    [cleanEmail, hashPassword(String(password)), role, String(nama || '')]
  )

  return NextResponse.json({ ok: true, user: res.rows[0] })
}

// DELETE /api/manage-user — delete a user (hard delete)
export async function DELETE(req: Request) {
  const user = await verifyDev()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  await query('DELETE FROM users WHERE id = $1', [userId])
  return NextResponse.json({ ok: true })
}
