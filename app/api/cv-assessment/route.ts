import { NextResponse, type NextRequest } from 'next/server'
import { pool, query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { CV_CRITERIA, CV_DECISIONS, CV_REJECT_REASONS } from '@/lib/constants'
import { calcCvScore, defaultWeights } from '@/lib/cv-score'
import { pickNextCandidate, stageAfterDecision } from '@/lib/cv-queue'
import { errorMessage } from '@/lib/errors'
import type { CvAssessment, CvDecision, CvScores } from '@/lib/types'

async function verifyHr() {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) return null
  return user
}

// Urutan sama dengan GET /api/candidates (daftar kandidat)
async function nextCandidate(currentId: string) {
  const r = await query<{ id: string; nama: string; has_cv: boolean; assessed: boolean }>(
    `SELECT c.id, c.nama, (f.candidate_id IS NOT NULL) AS has_cv, (c.cv IS NOT NULL) AS assessed
     FROM candidates c LEFT JOIN candidate_cv_files f ON f.candidate_id = c.id
     ORDER BY c.tanggal DESC, c.id`)
  const id = pickNextCandidate(r.rows.map(x => ({ id: x.id, hasCv: x.has_cv, assessed: x.assessed })), currentId)
  const row = id ? r.rows.find(x => x.id === id)! : null
  return row ? { id: row.id, nama: row.nama } : null
}

// GET /api/cv-assessment?candidateId=   → penilaian terkini + riwayat revisi
// GET /api/cv-assessment?next=<id>      → kandidat berikutnya yang punya CV & belum dinilai
export async function GET(req: NextRequest) {
  if (!await verifyHr()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sp = req.nextUrl.searchParams
  if (sp.has('next')) return NextResponse.json({ next: await nextCandidate(sp.get('next') || '') })

  const id = sp.get('candidateId')
  if (!id) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })
  const c = await query('SELECT cv FROM candidates WHERE id = $1', [id])
  if (!c.rows[0]) return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 })
  const h = await query(
    `SELECT id, percent, floor_percent, verdict, decision, reject_reason, ai_percent, stage_before, stage_after, assessed_by, assessed_at
     FROM cv_assessment_history WHERE candidate_id = $1 ORDER BY assessed_at DESC LIMIT 50`, [id])
  return NextResponse.json({ assessment: c.rows[0].cv ?? null, history: h.rows })
}

// POST /api/cv-assessment { candidateId, scores, decision, reject_reason?, notes?, confirmIncomplete? }
// Skor dihitung ulang di server dari bobot posisi saat ini (disimpan sebagai snapshot).
// Hanya endpoint ini (tombol Simpan HR) yang mengubah tahap kandidat dari Penilaian CV.
export async function POST(req: Request) {
  const user = await verifyHr()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    candidateId?: string; scores?: Record<string, unknown>; decision?: string
    reject_reason?: string | null; notes?: string; confirmIncomplete?: boolean
  } | null
  if (!body?.candidateId) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })

  const decision = body.decision as CvDecision
  if (!CV_DECISIONS.some(d => d.id === decision)) {
    return NextResponse.json({ error: 'Pilih keputusan dulu: Lanjut Psikotes, Tahan, atau Tidak lanjut.' }, { status: 400 })
  }
  const reason = decision === 'tolak' ? (body.reject_reason || '') : null
  if (decision === 'tolak' && !CV_REJECT_REASONS.some(r => r.code === reason)) {
    return NextResponse.json({ error: 'Pilih alasan tidak lanjut dulu.' }, { status: 400 })
  }

  const scores: CvScores = {}
  for (const cr of CV_CRITERIA) {
    const v = body.scores?.[cr.id]
    if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5) scores[cr.id] = v
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const cr = await client.query(
      `SELECT c.id, c.stage, c.posisi, p.weights, f.ai_result
       FROM candidates c LEFT JOIN positions p ON p.id = c.posisi
       LEFT JOIN candidate_cv_files f ON f.candidate_id = c.id AND f.ai_status = 'done'
       WHERE c.id = $1 FOR UPDATE OF c`, [body.candidateId])
    const cand = cr.rows[0]
    if (!cand) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 }) }

    const weights: Record<string, number> = cand.weights && Object.keys(cand.weights).length ? cand.weights : defaultWeights()
    const r = calcCvScore(scores, weights)
    if (r.verdict === 'Data belum cukup' && !body.confirmIncomplete) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'incomplete', filled: r.filled }, { status: 409 })
    }

    const now = new Date()
    const stageAfter = stageAfterDecision(cand.stage, decision)
    const aiPercent = cand.ai_result?.scores ? calcCvScore(cand.ai_result.scores, weights).percent : null
    const cv: CvAssessment = {
      scores, got: r.got, max: r.max, maxFilled: r.maxFilled, percent: r.percent, floor: r.floor,
      verdict: r.verdict, filled: r.filled, notes: (body.notes || '').trim().slice(0, 5000),
      date: now.toISOString().slice(0, 10),
      position_id: cand.posisi, weights_snapshot: weights,
      decision, reject_reason: reason, assessed_by: user.id, assessed_at: now.toISOString(),
    }

    await client.query('UPDATE candidates SET cv = $2, stage = $3 WHERE id = $1', [cand.id, JSON.stringify(cv), stageAfter])
    await client.query(
      `INSERT INTO cv_assessment_history
        (candidate_id, position_id, scores, weights_snapshot, percent, floor_percent, verdict, decision,
         reject_reason, notes, ai_percent, stage_before, stage_after, assessed_by, assessed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [cand.id, cand.posisi, JSON.stringify(scores), JSON.stringify(weights), r.percent, r.floor, r.verdict, decision,
        reason, cv.notes, aiPercent, cand.stage, stageAfter, user.id, now.toISOString()])
    await client.query('COMMIT')

    return NextResponse.json({ ok: true, assessment: cv, stage: stageAfter, stageBefore: cand.stage, next: await nextCandidate(cand.id) })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  } finally {
    client.release()
  }
}
