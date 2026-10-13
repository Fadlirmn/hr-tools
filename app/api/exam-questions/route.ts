import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'
import { DISC_QUESTIONS as DISC_FALLBACK, IQ_QUESTIONS as IQ_FALLBACK } from '@/lib/constants'
import type { DiscQuestion, IqQuestion } from '@/lib/types'

/**
 * GET /api/exam-questions
 *
 * Returns DISC blocks and IQ questions.
 * DISC has no answer key (most/least are self-reported) — full data always returned.
 * IQ answer key (field `a`) is STRIPPED for candidates; HR/dev get full data.
 */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isHr = user.role === 'hr' || user.role === 'dev'

  const res = await query<{ id: string; type: string; data: unknown }>('SELECT id,type,data FROM exam_questions')

  function parseData<T>(raw: unknown, fallback: T[]): T[] {
    if (Array.isArray(raw) && raw.length > 0) return raw as T[]
    return fallback
  }

  const discRaw = parseData<DiscQuestion>(res.rows.find(r => r.type === 'disc')?.data, DISC_FALLBACK)
  const iqRaw = parseData<IqQuestion>(res.rows.find(r => r.type === 'iq')?.data, IQ_FALLBACK)

  if (isHr) {
    return NextResponse.json({ disc: discRaw, iq: iqRaw })
  }

  // Candidate: strip IQ answer key before sending. DISC has no key to strip.
  const iqSafe = iqRaw.map(({ a: _a, ...rest }) => rest)

  return NextResponse.json({ disc: discRaw, iq: iqSafe })
}

// POST /api/exam-questions — upsert bank soal (hanya hr/dev, dipakai editor di /hr/questions)
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { type, data } = await req.json() as { type: 'disc' | 'iq'; data: unknown[] }
  if (type !== 'disc' && type !== 'iq') {
    return NextResponse.json({ error: 'type harus disc atau iq' }, { status: 400 })
  }

  const id = type === 'disc' ? 'disc_blocks' : 'iq_questions'
  const label = type === 'disc' ? 'Tes DISC' : 'Tes IQ'

  try {
    await query(
      `INSERT INTO exam_questions (id, type, label, data) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET data = $4`,
      [id, type, label, JSON.stringify(data)]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
