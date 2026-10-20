import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'
import { IQ_QUESTIONS as IQ_FALLBACK } from '@/lib/constants'
import { calcDiscGraphs } from '@/lib/disc-scoring'
import { calcIq, estimateIq, classifyIq } from '@/lib/iq-scoring'
import { sendEmail } from '@/lib/email'
import type { IqQuestion, DiscAnswer, DiscResult, IqResult } from '@/lib/types'
import { examColumns, computeDeadlineMs, SUBMIT_GRACE_SEC, type ExamWindowRow } from '@/lib/exam-timing'

/**
 * POST /api/exam-submit
 *
 * Accepts raw candidate answers for either 'disc' or 'iq', computes the score
 * (deterministic — never LLM), saves the result to candidates.psikotes_result,
 * and notifies HR by email.
 *
 * DISC scoring uses the fixed mapping/conversion tables in lib/disc-scoring.ts
 * (tied to the 24 original question numbers) — independent of any wording
 * edits HR makes via the questions editor, since the psychometric structure
 * (which letter maps to which DISC dimension) is not customizable per-edit.
 *
 * Body (disc): { type: 'disc', candidateId: string, answers: Record<number, {most, least}> }
 * Body (iq):   { type: 'iq', candidateId: string, answers: Record<number,number> }
 *
 * Verifikasi server untuk kandidat:
 * - candidateId harus milik user yang login
 * - tes harus sudah dimulai lewat /api/exam-start (started_at terisi)
 * - belum ada hasil untuk tipe tes ini
 * - now() <= min(started_at + time_limit, close_at) + SUBMIT_GRACE_SEC
 */
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isCandidate = user.role === 'candidate'
  const isHr = user.role === 'hr' || user.role === 'dev'

  if (!isCandidate && !isHr) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { type, candidateId } = body as { type: 'disc' | 'iq'; candidateId: string | null }

  if (type !== 'disc' && type !== 'iq') {
    return NextResponse.json({ error: 'type harus disc atau iq' }, { status: 400 })
  }

  // ===== Verifikasi sisi server (kandidat) =====
  let timing: { startedAt: string | null; deadline: string | null; submittedAt: string; lateBySec: number } | null = null
  if (isCandidate) {
    if (!candidateId) return NextResponse.json({ error: 'candidateId wajib' }, { status: 400 })
    const col = examColumns(type)
    const chk = await query<ExamWindowRow & { user_id: string | null; has_result: boolean; server_now: Date }>(
      `SELECT user_id,
              ${col.openAt} AS open_at, ${col.closeAt} AS close_at,
              ${col.timeLimit} AS time_limit, ${col.startedAt} AS started_at,
              (psikotes_result->'${type}') IS NOT NULL AND (psikotes_result->'${type}') <> 'null'::jsonb AS has_result,
              now() AS server_now
         FROM candidates WHERE id = $1 LIMIT 1`,
      [candidateId]
    )
    const row = chk.rows[0]
    if (!row) return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 })
    if (row.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (row.has_result) return NextResponse.json({ error: 'Tes sudah pernah dikumpulkan' }, { status: 409 })
    if (!row.started_at) return NextResponse.json({ error: 'Tes belum dimulai. Klik Mulai Tes terlebih dahulu.' }, { status: 409 })

    const nowMs = new Date(row.server_now).getTime()
    const deadlineMs = computeDeadlineMs(row)
    if (deadlineMs == null) return NextResponse.json({ error: 'Akses tes tidak valid' }, { status: 403 })
    const lateBySec = Math.max(0, Math.ceil((nowMs - deadlineMs) / 1000))
    if (lateBySec > SUBMIT_GRACE_SEC) {
      return NextResponse.json(
        { error: `Waktu pengerjaan sudah habis (${lateBySec} detik lewat batas). Jawaban tidak diterima.`, code: 'TIME_UP', lateBySec },
        { status: 410 }
      )
    }
    timing = {
      startedAt: new Date(row.started_at).toISOString(),
      deadline: new Date(deadlineMs).toISOString(),
      submittedAt: new Date(nowMs).toISOString(),
      lateBySec,
    }
  }

  function parseData<T>(raw: unknown, fallback: T[]): T[] {
    if (Array.isArray(raw) && raw.length > 0) return raw as T[]
    return fallback
  }

  const via: 'kandidat' | 'hr' = isCandidate ? 'kandidat' : 'hr'
  let result: DiscResult | IqResult

  if (type === 'disc') {
    const { answers } = body as { answers: Record<number, DiscAnswer> }
    const { adapted, natural } = calcDiscGraphs(answers || {})
    result = { answers: { ...answers }, adapted, natural, date: new Date().toISOString().slice(0, 10), via }
  } else {
    const { answers } = body as { answers: Record<number, number> }
    const qRes = await query<{ data: unknown }>(`SELECT data FROM exam_questions WHERE type = 'iq' LIMIT 1`)
    const questions = parseData<IqQuestion>(qRes.rows[0]?.data, IQ_FALLBACK)

    result = { answers: { ...answers }, ...calcIq(answers || {}, questions), date: new Date().toISOString().slice(0, 10), via }
  }

  if (candidateId) {
    const candRes = await query<{ psikotes_result: { disc?: DiscResult; iq?: IqResult } | null; nama: string; email: string }>(
      'SELECT psikotes_result, nama, email FROM candidates WHERE id = $1 LIMIT 1',
      [candidateId]
    )
    const current = candRes.rows[0]

    const nextPsikotesResult = {
      disc: type === 'disc' ? result : (current?.psikotes_result?.disc ?? null),
      iq: type === 'iq' ? result : (current?.psikotes_result?.iq ?? null),
    }

    try {
      if (isCandidate) {
        await query(
          `UPDATE candidates SET psikotes_result = $1, stage = 'interview' WHERE id = $2`,
          [nextPsikotesResult, candidateId]
        )
      } else {
        await query(`UPDATE candidates SET psikotes_result = $1 WHERE id = $2`, [nextPsikotesResult, candidateId])
      }
    } catch (err) {
      return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
    }

    // Notify HR best-effort — never block the primary save.
    try {
      const hrEmail = process.env.HR_NOTIFY_EMAIL
      if (hrEmail && current) {
        const summary = type === 'disc'
          ? `Pola Adapted Style: <b>${(result as DiscResult).adapted.pattern.name}</b> (tipe ${(result as DiscResult).adapted.pattern.type})`
          : (() => {
              const r = result as IqResult
              const score = estimateIq(r.percent)
              return `Skor: <b>${r.correct}/${r.total}</b> (${r.percent}%) — ${r.category} · Perkiraan IQ <b>${score}</b> (${classifyIq(score).label})`
            })()
        await sendEmail({
          to: hrEmail,
          subject: `Hasil ${type === 'disc' ? 'Tes DISC' : 'Tes IQ'} — ${current.nama}`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Hasil ${type === 'disc' ? 'Tes DISC' : 'Tes IQ'}</h2>
            <p>Kandidat <b>${current.nama}</b> baru saja menyelesaikan ${type === 'disc' ? 'Tes DISC' : 'Tes IQ'}.</p>
            <p>${summary}</p>
          </div>`,
        })
      }
    } catch {
      // email gagal, hasil tetap tersimpan — tidak dilaporkan sebagai error ke caller
    }
  }

  return NextResponse.json({ ok: true, result: { ...result, candidateId: candidateId ?? null }, timing })
}
