import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'

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

// POST /api/manage-user — update role (and optionally nama) for a user
export async function POST(req: Request) {
  const user = await verifyDev()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, role, nama } = body as { userId: string; role: string; nama?: string }

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  const allowed = ['hr', 'dev', 'candidate']
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  await query(
    `UPDATE users SET role = $1, nama = COALESCE($2, nama) WHERE id = $3`,
    [role, nama, userId]
  )

  return NextResponse.json({ ok: true })
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
