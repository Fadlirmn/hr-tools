import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { readCvFile } from '@/lib/cv-file'
import { uploadPrecheck, verifyCvParses } from '@/lib/cv-file-server'
import { queueScreening } from '@/lib/cv-screening'
import { errorMessage } from '@/lib/errors'

// POST /api/cv-bulk — multipart { file, posisi, sumber } (HR/dev).
// Satu request = satu file → satu kandidat baru (client mengirim berurutan agar
// progres per file terlihat). Nama sementara "[CV] <nama file>" diganti otomatis
// oleh hasil ekstraksi AI bila screening aktif.
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const blocked = uploadPrecheck(req, user.id, true)
  if (blocked) return blocked

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Form upload tidak valid' }, { status: 400 }) }

  const posisi = form.get('posisi')
  const sumber = form.get('sumber')
  if (typeof posisi !== 'string' || !posisi) return NextResponse.json({ error: 'Posisi wajib dipilih' }, { status: 400 })
  const pos = await query('SELECT 1 FROM positions WHERE id = $1', [posisi])
  if (!pos.rows[0]) return NextResponse.json({ error: 'Posisi tidak ditemukan' }, { status: 400 })

  const parsed = await readCvFile(form.get('file'))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const broken = await verifyCvParses(parsed.buf, parsed.mime)
  if (broken) return NextResponse.json({ error: broken }, { status: 400 })

  const id = uuidv4()
  const tempName = '[CV] ' + parsed.filename.replace(/\.(pdf|jpe?g|png|webp)$/i, '').slice(0, 100)
  try {
    await query(
      `INSERT INTO candidates (id, nama, posisi, sumber, stage, tanggal) VALUES ($1, $2, $3, $4, 'screening', $5)`,
      [id, tempName, posisi, typeof sumber === 'string' && sumber ? sumber.slice(0, 60) : 'Lainnya', new Date().toISOString().slice(0, 10)]
    )
    await query(
      `INSERT INTO candidate_cv_files (candidate_id, filename, mime, size, data, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, parsed.filename, parsed.mime, parsed.buf.length, parsed.buf, user.id]
    )
    const queued = await queueScreening(id, { fillCandidate: true })
    return NextResponse.json({ ok: true, candidateId: id, ai: queued ? 'processing' : 'none' })
  } catch (err) {
    await query('DELETE FROM candidates WHERE id = $1', [id]).catch(() => {})
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
