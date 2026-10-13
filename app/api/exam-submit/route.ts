import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'
import { IQ_QUESTIONS as IQ_FALLBACK } from '@/lib/constants'
import { calcDiscGraphs } from '@/lib/disc-scoring'
import { sendEmail } from '@/lib/email'
import type { IqQuestion, DiscAnswer, DiscResult, IqResult } from '@/lib/types'

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

    let correct = 0
    questions.forEach((q, i) => { if (Number(answers[i]) === q.a) correct++ })
    const total = questions.length
    const percent = total ? Math.round((correct / total) * 100) : 0
    const category: IqResult['category'] = percent >= 80 ? 'Tinggi' : percent >= 50 ? 'Rata-rata' : 'Perlu Perhatian'

    result = { answers: { ...answers }, correct, total, percent, category, date: new Date().toISOString().slice(0, 10), via }
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
          : `Skor: <b>${(result as IqResult).correct}/${(result as IqResult).total}</b> (${(result as IqResult).percent}%) — ${(result as IqResult).category}`
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

  return NextResponse.json({ ok: true, result: { ...result, candidateId: candidateId ?? null } })
}
