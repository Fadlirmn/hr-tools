// Pengaman upload file CV — fungsi murni (tanpa DB), dipakai server & unit test.
import type { CvMime } from './cv-file'

const EXT: Record<CvMime, string> = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

/**
 * Nama file aman untuk disimpan & dikirim di header: tanpa path (../, \), tanpa karakter
 * kontrol/khusus, maks. 120 karakter, dan ekstensi disamakan dengan isi file sebenarnya.
 */
export function safeFilename(name: string, mime: CvMime): string {
  const base = (name || '').split(/[\\/]/).pop() || ''
  let stem = base.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f<>:"|?*`$;&]/g, '')
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+/, '')
    .trim()
    .slice(0, 110)
  if (!stem) stem = 'cv'
  return stem + EXT[mime]
}

// Fitur PDF yang tidak dibutuhkan CV dan sering dipakai PDF berbahaya.
const PDF_RISKY: [RegExp, string][] = [
  [/\/JavaScript\b/, 'JavaScript'],
  [/\/JS\b/, 'JavaScript'],
  [/\/Launch\b/, 'perintah menjalankan program'],
  [/\/EmbeddedFiles?\b/, 'file tersisip'],
  [/\/RichMedia\b/, 'media aktif'],
  [/\/XFA\b/, 'formulir XFA'],
  [/\/SubmitForm\b/, 'pengiriman formulir'],
  [/\/ImportData\b/, 'impor data'],
]

/** Daftar fitur berbahaya yang ditemukan di PDF (kosong = aman). */
export function pdfThreats(buf: Buffer): string[] {
  const text = buf.toString('latin1')
  return [...new Set(PDF_RISKY.filter(([re]) => re.test(text)).map(([, label]) => label))]
}

/** Ukuran gambar dari header (PNG/JPEG/WEBP), null bila header rusak. */
export function imageSize(buf: Buffer, mime: CvMime): { w: number; h: number } | null {
  try {
    if (mime === 'image/png') {
      if (buf.subarray(12, 16).toString('latin1') !== 'IHDR') return null
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
    }
    if (mime === 'image/webp') {
      const kind = buf.subarray(12, 16).toString('latin1')
      if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }
      if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 } }
      if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
      return null
    }
    if (mime === 'image/jpeg') {
      let i = 2
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) return null
        const m = buf[i + 1]
        const len = buf.readUInt16BE(i + 2)
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
        i += 2 + len
      }
      return null
    }
  } catch { return null }
  return null
}

export const MAX_IMAGE_SIDE = 10000

/** Pembatas laju sederhana di memori (per proses): maks. `limit` kejadian per `windowMs`. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string, now = Date.now()): { ok: boolean; retryAfterSec: number } => {
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs)
    if (arr.length >= limit) {
      hits.set(key, arr)
      return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - arr[0])) / 1000) }
    }
    arr.push(now)
    hits.set(key, arr)
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k)
    return { ok: true, retryAfterSec: 0 }
  }
}
