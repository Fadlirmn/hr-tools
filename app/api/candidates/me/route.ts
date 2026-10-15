import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { isValidPhone, PHONE_ERROR } from '@/lib/phone'
import { errorMessage } from '@/lib/errors'

/**
 * PATCH /api/candidates/me — kandidat update field terbatas pada
 * record miliknya sendiri (nama/email/telepon dari halaman Profil Saya,
 * atau psikotes_result/stage saat submit psikotes mandiri).
 */
const ALLOWED_FIELDS = new Set(['nama', 'email', 'telepon', 'psikotes_result', 'stage'])

export async function PATCH(req: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== 'candidate') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const fields = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED_FIELDS.has(k)))

  if ('telepon' in fields && !isValidPhone(fields.telepon)) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 })
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field valid untuk diupdate' }, { status: 400 })
  }

  const cols = Object.keys(fields)
  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ')
  const vals = cols.map(c => (fields as Record<string, unknown>)[c])

  try {
    await query(
      `UPDATE candidates SET ${setClause} WHERE user_id = $${cols.length + 1}`,
      [...vals, user.id]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
