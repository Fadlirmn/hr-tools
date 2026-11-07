import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { readCvFile } from '@/lib/cv-file'
import { uploadPrecheck, verifyCvParses } from '@/lib/cv-file-server'
import { queueScreening } from '@/lib/cv-screening'
import { errorMessage } from '@/lib/errors'

const isHr = (role?: string) => role === 'hr' || role === 'dev'

// POST /api/cv-file — multipart { file, candidateId?, consent? }
// HR/dev: upload untuk kandidat mana saja (candidateId wajib).
// Kandidat: hanya untuk record miliknya sendiri (candidateId diabaikan) + wajib consent.
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isHr(user.role) && user.role !== 'candidate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const blocked = uploadPrecheck(req, user.id, isHr(user.role))
  if (blocked) return blocked

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Form upload tidak valid' }, { status: 400 }) }

  let candidateId: string | null = null
  if (isHr(user.role)) {
    const id = form.get('candidateId')
    if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })
    const r = await query('SELECT id FROM candidates WHERE id = $1', [id])
    if (!r.rows[0]) return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 })
    candidateId = id
  } else if (user.role === 'candidate') {
    if (form.get('consent') !== '1') {
      return NextResponse.json({ error: 'Persetujuan pemrosesan data wajib dicentang' }, { status: 400 })
    }
    const r = await query<{ id: string }>('SELECT id FROM candidates WHERE user_id = $1 LIMIT 1', [user.id])
    if (!r.rows[0]) return NextResponse.json({ error: 'Data kandidat tidak ditemukan' }, { status: 404 })
    candidateId = r.rows[0].id
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await readCvFile(form.get('file'))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const broken = await verifyCvParses(parsed.buf, parsed.mime)
  if (broken) return NextResponse.json({ error: broken }, { status: 400 })

  try {
    await query(
      `INSERT INTO candidate_cv_files (candidate_id, filename, mime, size, data, uploaded_by, uploaded_at, ai_status, ai_result, ai_error)
       VALUES ($1, $2, $3, $4, $5, $6, now(), 'none', NULL, NULL)
       ON CONFLICT (candidate_id) DO UPDATE SET filename = $2, mime = $3, size = $4, data = $5, uploaded_by = $6,
         uploaded_at = now(), ai_status = 'none', ai_result = NULL, ai_error = NULL`,
      [candidateId, parsed.filename, parsed.mime, parsed.buf.length, parsed.buf, user.id]
    )
    const queued = await queueScreening(candidateId)
    return NextResponse.json({ ok: true, filename: parsed.filename, ai: queued ? 'processing' : 'none' })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// GET /api/cv-file?candidateId= — tampilkan/unduh file (HR/dev saja). &download=1 untuk unduh.
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isHr(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('candidateId')
  if (!id) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })

  const r = await query<{ data: Buffer; mime: string; filename: string }>(
    'SELECT data, mime, filename FROM candidate_cv_files WHERE candidate_id = $1', [id])
  const f = r.rows[0]
  if (!f) return NextResponse.json({ error: 'CV belum diupload' }, { status: 404 })

  // Hanya tipe yang lolos validasi upload yang disajikan inline; selain itu dipaksa unduh
  const SAFE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  const safeType = SAFE.includes(f.mime)
  const disp = req.nextUrl.searchParams.get('download') === '1' || !safeType ? 'attachment' : 'inline'
  const asciiName = f.filename.replace(/[^\x20-\x7e]/g, '_')
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      'Content-Type': safeType ? f.mime : 'application/octet-stream',
      'Content-Length': String(f.data.length),
      'Content-Disposition': `${disp}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Referrer-Policy': 'no-referrer',
      // Gambar: sandbox penuh. PDF: tanpa sandbox (viewer PDF browser menolak dokumen ber-sandbox),
      // tapi PDF berisi JavaScript/aksi sudah ditolak saat upload.
      ...(f.mime.startsWith('image/') ? { 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } : {}),
      'Cache-Control': 'private, no-store',
    },
  })
}

// DELETE /api/cv-file?candidateId= — hapus file CV (HR/dev saja)
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isHr(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('candidateId')
  if (!id) return NextResponse.json({ error: 'candidateId wajib ada' }, { status: 400 })
  await query('DELETE FROM candidate_cv_files WHERE candidate_id = $1', [id])
  return NextResponse.json({ ok: true })
}
