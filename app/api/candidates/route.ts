import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { isValidPhone, PHONE_ERROR } from '@/lib/phone'
import { errorMessage } from '@/lib/errors'

async function verifyHr() {
  const user = await getSessionUser()
  if (!user) return null
  if (user.role !== 'hr' && user.role !== 'dev') return null
  return user
}

// GET /api/candidates — list all candidates
export async function GET() {
  const user = await verifyHr()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const res = await query('SELECT * FROM candidates ORDER BY tanggal DESC')
  return NextResponse.json({ candidates: res.rows })
}

// POST /api/candidates — insert new candidate
export async function POST(req: Request) {
  const user = await verifyHr()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as Record<string, unknown>
  if (!(typeof body?.nama === 'string' && body.nama.trim())) {
    return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
  }
  if ('telepon' in body && !isValidPhone(body.telepon)) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 })
  }

  const cols = Object.keys(body)
  const vals = cols.map(c => body[c])
  const placeholders = cols.map((_, i) => `$${i + 1}`)

  try {
    await query(
      `INSERT INTO candidates (${cols.join(',')}) VALUES (${placeholders.join(',')})`,
      vals
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// PATCH /api/candidates — update single or bulk candidates
export async function PATCH(req: Request) {
  const user = await verifyHr()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as Record<string, unknown>

  // Bulk update: { _bulk: { ids: string[], ...fields } }
  if (body._bulk) {
    const { ids, ...fields } = body._bulk as { ids: string[] } & Record<string, unknown>
    if (!ids || ids.length === 0) return NextResponse.json({ error: 'ids wajib ada' }, { status: 400 })
    if ('telepon' in fields && !isValidPhone(fields.telepon)) {
      return NextResponse.json({ error: PHONE_ERROR }, { status: 400 })
    }

    const cols = Object.keys(fields)
    if (cols.length === 0) return NextResponse.json({ error: 'tidak ada field untuk diupdate' }, { status: 400 })

    const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ')
    const vals = cols.map(c => fields[c])
    const idsPlaceholder = `$${cols.length + 1}`

    try {
      await query(
        `UPDATE candidates SET ${setClause} WHERE id = ANY(${idsPlaceholder})`,
        [...vals, ids]
      )
      return NextResponse.json({ ok: true })
    } catch (err) {
      return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
    }
  }

  // Single update: { id, ...fields }
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id wajib ada' }, { status: 400 })
  if ('telepon' in fields && !isValidPhone(fields.telepon)) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 })
  }

  const cols = Object.keys(fields)
  if (cols.length === 0) return NextResponse.json({ error: 'tidak ada field untuk diupdate' }, { status: 400 })

  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ')
  const vals = cols.map(c => fields[c])

  try {
    await query(`UPDATE candidates SET ${setClause} WHERE id = $${cols.length + 1}`, [...vals, id])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// DELETE /api/candidates — wipe SEMUA kandidat (tombol "Hapus semua data" di Settings).
// Hanya menghapus baris candidates — tidak menghapus akun users terkait (beda
// dengan /api/delete-user yang menghapus satu kandidat + akunnya sekaligus).
export async function DELETE() {
  const user = await verifyHr()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await query('DELETE FROM candidates')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
