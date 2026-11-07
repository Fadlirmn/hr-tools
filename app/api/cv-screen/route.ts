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
  if (!(await isAiEnabled())) return NextResponse.json({ error: 'Screening otomatis belum aktif — atur di menu Admin → Pengaturan AI (atau .env).' }, { status: 400 })

  const { candidateId } = await req.json().catch(() => ({}))
  if (!candidateId) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })
  const r = await query('SELECT 1 FROM candidate_cv_files WHERE candidate_id = $1', [candidateId])
  if (!r.rows[0]) return NextResponse.json({ error: 'CV belum diupload' }, { status: 404 })

  await queueScreening(candidateId)
  return NextResponse.json({ ok: true })
}
