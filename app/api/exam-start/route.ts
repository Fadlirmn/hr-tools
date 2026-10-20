import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'
import { examColumns, isWindowOpen, remainingSeconds, computeDeadlineMs, type ExamWindowRow } from '@/lib/exam-timing'

/**
 * POST /api/exam-start — kandidat menandai mulai mengerjakan tes.
 *
 * Body: { type: 'disc' | 'iq' }
 *
 * - started_at diset SEKALI memakai jam server (now()); panggilan berikutnya
 *   (refresh/buka ulang) tidak mereset, hanya mengembalikan sisa waktu.
 * - Sisa waktu dihitung server: min(started_at + time_limit, close_at) - now().
 *   Client memakai `remainingSec` sebagai seed countdown lokal.
 */
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== 'candidate') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { type } = body as { type?: 'disc' | 'iq' }
  if (type !== 'disc' && type !== 'iq') {
    return NextResponse.json({ error: 'type harus disc atau iq' }, { status: 400 })
  }

  const col = examColumns(type)

  try {
    const cur = await query<ExamWindowRow & { id: string; has_result: boolean; server_now: Date }>(
      `SELECT id,
              ${col.openAt} AS open_at, ${col.closeAt} AS close_at,
              ${col.timeLimit} AS time_limit, ${col.startedAt} AS started_at,
              (psikotes_result->'${type}') IS NOT NULL AND (psikotes_result->'${type}') <> 'null'::jsonb AS has_result,
              now() AS server_now
         FROM candidates WHERE user_id = $1 LIMIT 1`,
      [user.id]
    )
    const row = cur.rows[0]
    if (!row) return NextResponse.json({ error: 'Data kandidat tidak ditemukan' }, { status: 404 })
    if (row.has_result) return NextResponse.json({ error: 'Tes sudah pernah dikumpulkan' }, { status: 409 })

    const nowMs = new Date(row.server_now).getTime()
    if (!isWindowOpen(row, nowMs)) {
      return NextResponse.json({ error: 'Akses tes belum dibuka atau sudah kedaluwarsa' }, { status: 403 })
    }

    // Set started_at hanya jika masih NULL (idempoten).
    const upd = await query<{ started_at: Date; server_now: Date }>(
      `UPDATE candidates
          SET ${col.startedAt} = COALESCE(${col.startedAt}, now())
        WHERE id = $1
        RETURNING ${col.startedAt} AS started_at, now() AS server_now`,
      [row.id]
    )
    const started = upd.rows[0]
    const fresh: ExamWindowRow = { ...row, started_at: started.started_at }
    const serverNowMs = new Date(started.server_now).getTime()
    const remainingSec = remainingSeconds(fresh, serverNowMs) ?? 0
    const deadlineMs = computeDeadlineMs(fresh)

    return NextResponse.json({
      ok: true,
      candidateId: row.id,
      startedAt: new Date(started.started_at).toISOString(),
      serverNow: new Date(serverNowMs).toISOString(),
      deadline: deadlineMs != null ? new Date(deadlineMs).toISOString() : null,
      timeLimit: row.time_limit,
      remainingSec,
    })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
