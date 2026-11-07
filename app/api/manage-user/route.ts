import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser, hashPassword } from '@/lib/auth'

// Admin = role 'hr' atau 'dev'. Aturan keamanan:
// - Tidak ada yang bisa menghapus akun sendiri atau mengubah role akun sendiri.
// - HR tidak bisa menghapus akun 'dev', mengubah role-nya, atau mengganti password-nya.
// - Hanya 'dev' yang bisa memberi role 'dev' (mencegah HR menaikkan hak akses).
async function verifyAdmin() {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) return null
  return user
}

async function getTarget(userId: string) {
  const r = await query<{ id: string; role: string }>('SELECT id, role FROM users WHERE id = $1 LIMIT 1', [userId])
  return r.rows[0] || null
}

// GET /api/manage-user — list all users
export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const res = await query(
    `SELECT id, email, role, nama, created_at, last_sign_in_at FROM users ORDER BY created_at DESC`
  )
  return NextResponse.json({ users: res.rows })
}

// POST /api/manage-user — update role (and optionally nama + password) for a user
export async function POST(req: Request) {
  const user = await verifyAdmin()
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

  const target = await getTarget(userId)
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  if (target.id === user.id && role !== target.role) {
    return NextResponse.json({ error: 'Tidak bisa mengubah role akun sendiri' }, { status: 400 })
  }
  if (user.role !== 'dev') {
    if (target.role === 'dev' && role !== 'dev') {
      return NextResponse.json({ error: 'HR tidak bisa mengubah role akun Admin Dev' }, { status: 403 })
    }
    if (target.role === 'dev' && password) {
      return NextResponse.json({ error: 'HR tidak bisa mengganti password akun Admin Dev' }, { status: 403 })
    }
    if (role === 'dev' && target.role !== 'dev') {
      return NextResponse.json({ error: 'Hanya Admin Dev yang bisa memberi role Dev' }, { status: 403 })
    }
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

// PUT /api/manage-user — tambah user baru (admin: hr/dev)
// Body: { email, password, role, nama? }
export async function PUT(req: Request) {
  const user = await verifyAdmin()
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
  if (role === 'dev' && user.role !== 'dev') {
    return NextResponse.json({ error: 'Hanya Admin Dev yang bisa membuat akun Dev' }, { status: 403 })
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
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  if (userId === user.id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }
  const target = await getTarget(userId)
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  if (target.role === 'dev' && user.role !== 'dev') {
    return NextResponse.json({ error: 'HR tidak bisa menghapus akun Admin Dev' }, { status: 403 })
  }

  await query('DELETE FROM users WHERE id = $1', [userId])
  return NextResponse.json({ ok: true })
}
