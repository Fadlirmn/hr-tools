// Validasi lanjutan yang butuh parser PDF — server saja (jangan diimpor komponen client).
import { getDocumentProxy } from 'unpdf'
import type { CvMime } from './cv-file'

export const MAX_PDF_PAGES = 20

/** Pastikan PDF benar-benar bisa dibuka parser (bukan file palsu/rusak) dan tidak terlalu panjang. */
export async function verifyCvParses(buf: Buffer, mime: CvMime): Promise<string | null> {
  if (mime !== 'application/pdf') return null
  try {
    const doc = await getDocumentProxy(new Uint8Array(buf))
    const pages = doc.numPages
    await (doc as unknown as { destroy?: () => Promise<void> }).destroy?.()
    if (pages < 1) return 'PDF tidak berisi halaman.'
    if (pages > MAX_PDF_PAGES) return `PDF terlalu panjang (${pages} halaman, maks. ${MAX_PDF_PAGES}).`
    return null
  } catch (err) {
    const name = (err as { name?: string })?.name
    if (name === 'PasswordException') return 'PDF terkunci password. Buka kuncinya atau simpan ulang sebagai PDF biasa.'
    if (name === 'InvalidPDFException') return 'PDF rusak atau tidak lengkap. Simpan ulang sebagai PDF biasa.'
    // Masalah parser di server (bukan salah file): jangan tolak, header & isi berbahaya sudah dicek
    console.error('[cv] verifikasi PDF dilewati:', err)
    return null
  }
}

import { NextResponse } from 'next/server'
import { createRateLimiter } from './upload-guard'
import { CV_MAX_BYTES } from './cv-file'

// Batas upload per akun: kandidat 10/jam, HR 300/jam (upload massal).
const g = globalThis as unknown as { cvUploadLimit?: { cand: ReturnType<typeof createRateLimiter>; hr: ReturnType<typeof createRateLimiter> } }
g.cvUploadLimit ??= { cand: createRateLimiter(10, 3600_000), hr: createRateLimiter(300, 3600_000) }

/** Tolak lebih awal: request terlalu besar (sebelum dibaca) atau upload terlalu sering. */
export function uploadPrecheck(req: Request, userId: string, isHr: boolean): NextResponse | null {
  const len = Number(req.headers.get('content-length') || 0)
  if (len > CV_MAX_BYTES + 512 * 1024) {
    return NextResponse.json({ error: 'Ukuran file maksimal 5 MB' }, { status: 413 })
  }
  const r = (isHr ? g.cvUploadLimit!.hr : g.cvUploadLimit!.cand)(userId)
  if (!r.ok) {
    return NextResponse.json({ error: `Terlalu banyak upload. Coba lagi dalam ${Math.ceil(r.retryAfterSec / 60)} menit.` },
      { status: 429, headers: { 'Retry-After': String(r.retryAfterSec) } })
  }
  return null
}
