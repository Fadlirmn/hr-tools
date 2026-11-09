import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { isAiEnabled } from '@/lib/ai-config'
import { queueScreening } from '@/lib/cv-screening'

// GET /api/cv-screen?candidateId=
//  - HR/dev: metadata file + status & hasil screening AI.
//  - Kandidat: hanya metadata file miliknya (tanpa hasil AI); candidateId diabaikan.
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'candidate') {
    const r = await query(
      `SELECT f.filename, f.size, f.uploaded_at FROM candidate_cv_files f
       JOIN candidates c ON c.id = f.candidate_id WHERE c.user_id = $1 LIMIT 1`, [user.id])
    return NextResponse.json({ file: r.rows[0] ?? null })
  }
  if (user.role !== 'hr' && user.role !== 'dev') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ?list=1 — semua kandidat + ringkasan hasil AI (untuk menu Upload CV, dikelompokkan per posisi di client)
  if (req.nextUrl.searchParams.get('list') === '1') {
    const r = await query<Record<string, unknown>>(
      `SELECT c.id, c.nama, c.posisi, c.stage, c.tanggal, (c.cv IS NOT NULL) AS hr_done,
         (f.candidate_id IS NOT NULL) AS has_cv_file, f.filename, f.ai_status, f.ai_error,
         CASE WHEN f.ai_status = 'done' THEN jsonb_build_object(
           'percent', (f.ai_result->>'percent')::int,
           'verdict', COALESCE(f.ai_result->>'verdict', ''),
           'filled', COALESCE((f.ai_result->>'filled')::int, 0),
           'ringkasan', COALESCE(f.ai_result->'extracted'->>'ringkasan', ''),
           'pengalaman_tahun', f.ai_result->'extracted'->'pengalaman_tahun',
           'pendidikan_terakhir', COALESCE(f.ai_result->'extracted'->>'pendidikan_terakhir', ''),
           'skills', COALESCE(f.ai_result->'extracted'->'skills', '[]'::jsonb),
           'strengths', COALESCE(f.ai_result->'strengths', '[]'::jsonb),
           'concerns', COALESCE(f.ai_result->'concerns', '[]'::jsonb)
         ) END AS ai
       FROM candidates c LEFT JOIN candidate_cv_files f ON f.candidate_id = c.id
       ORDER BY c.tanggal DESC, c.id`)
    return NextResponse.json({ items: r.rows, aiEnabled: await isAiEnabled() })
  }

  const id = req.nextUrl.searchParams.get('candidateId')
  if (!id) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })
  const r = await query(
    `SELECT candidate_id, filename, mime, size, uploaded_at, ai_status, ai_result, ai_error
     FROM candidate_cv_files WHERE candidate_id = $1`, [id])
  return NextResponse.json({ file: r.rows[0] ?? null, aiEnabled: await isAiEnabled() })
}

// POST /api/cv-screen { candidateId } — jalankan ulang analisis AI (HR/dev)
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!(await isAiEnabled())) return NextResponse.json({ error: 'Screening otomatis belum aktif — atur di menu Pengaturan → Pengaturan AI (atau .env).' }, { status: 400 })

  const { candidateId } = await req.json().catch(() => ({}))
  if (!candidateId) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })
  const r = await query('SELECT 1 FROM candidate_cv_files WHERE candidate_id = $1', [candidateId])
  if (!r.rows[0]) return NextResponse.json({ error: 'CV belum diupload' }, { status: 404 })

  await queueScreening(candidateId)
  return NextResponse.json({ ok: true })
}
