import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'

// PATCH /api/auth/profile — update nama/username/telepon milik user yang login
export async function PATCH(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { nama, username, telepon } = body as { nama?: string; username?: string; telepon?: string }

  await query(
    `UPDATE users SET
       nama = COALESCE($1, nama),
       username = COALESCE($2, username),
       telepon = COALESCE($3, telepon)
     WHERE id = $4`,
    [nama, username, telepon, user.id]
  )

  return NextResponse.json({ success: true })
}
