import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'

// GET /api/positions — semua role login (hr/dev/candidate) boleh baca,
// sama seperti policy "positions_read USING (true)" di Supabase lama.
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await query('SELECT * FROM positions ORDER BY name')
  return NextResponse.json({ positions: res.rows })
}

// POST /api/positions — upsert satu posisi (hanya hr/dev)
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, name, weights, description } = await req.json()
  if (!id) return NextResponse.json({ error: 'id wajib ada' }, { status: 400 })
  // description opsional: bila tidak dikirim, nilai lama dipertahankan
  const desc = typeof description === 'string' ? description.slice(0, 4000) : null

  await query(
    `INSERT INTO positions (id, name, weights, description) VALUES ($1, $2, $3, COALESCE($4, ''))
     ON CONFLICT (id) DO UPDATE SET name = $2, weights = $3, description = COALESCE($4, positions.description)`,
    [id, name, weights, desc]
  )
  return NextResponse.json({ ok: true })
}

// DELETE /api/positions — hapus satu posisi (hanya hr/dev)
export async function DELETE(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id wajib ada' }, { status: 400 })

  await query('DELETE FROM positions WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
