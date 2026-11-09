import { pdfThreats, imageSize, safeFilename, MAX_IMAGE_SIDE } from './upload-guard'

// Validasi file CV — server-side. Hanya PDF/JPG/PNG/WEBP (format yang bisa dibaca
// langsung oleh screening AI). Tipe ditentukan dari magic bytes, bukan dari
// ekstensi/Content-Type kiriman browser (keduanya bisa dipalsukan).

export const CV_MAX_BYTES = 5 * 1024 * 1024
export const CV_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp'
export const CV_FORMAT_HINT = 'Format PDF, JPG, PNG, atau WEBP, maks. 5 MB.'

export type CvMime = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'

export function detectCvMime(buf: Buffer): CvMime | null {
  // %PDF- boleh didahului byte sampah (sebagian generator PDF), cari di 1 KB pertama
  if (buf.subarray(0, 1024).toString('latin1').includes('%PDF-')) return 'application/pdf'
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  return null
}

/** Nama format yang tidak didukung (untuk pesan error), mis. file .png yang isinya HEIC. */
export function describeUnsupported(buf: Buffer): string | null {
  const head = buf.subarray(0, 16).toString('latin1')
  if (head.startsWith('PK')) return 'Word/ZIP (.docx), export ke PDF dulu'
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'Word lama (.doc), export ke PDF dulu'
  if (buf.subarray(4, 12).toString('latin1').match(/^ftyp(heic|heix|mif1|msf1)/)) return 'HEIC (foto iPhone), ubah ke JPG dulu'
  if (buf.subarray(4, 12).toString('latin1').startsWith('ftypavi')) return 'AVIF, ubah ke JPG/PNG dulu'
  if (head.startsWith('GIF8')) return 'GIF, ubah ke PNG/JPG dulu'
  if (head.startsWith('BM')) return 'BMP, ubah ke PNG/JPG dulu'
  return null
}

/** Baca & validasi File dari FormData. Return buffer+mime atau pesan error. */
export async function readCvFile(file: unknown): Promise<{ ok: true; buf: Buffer; mime: CvMime; filename: string } | { ok: false; error: string }> {
  if (!file || typeof file === 'string' || typeof (file as File).arrayBuffer !== 'function') {
    return { ok: false, error: 'File CV wajib dipilih' }
  }
  const f = file as File
  if (f.size === 0) return { ok: false, error: 'File kosong' }
  if (f.size > CV_MAX_BYTES) return { ok: false, error: `Ukuran file maksimal 5 MB (file Anda ${(f.size / 1024 / 1024).toFixed(1)} MB)` }
  const buf = Buffer.from(await f.arrayBuffer())
  const mime = detectCvMime(buf)
  if (!mime) {
    const real = describeUnsupported(buf)
    return { ok: false, error: `Format tidak didukung${real ? `: isi file ${real}` : ''}. ${CV_FORMAT_HINT}` }
  }
  if (mime === 'application/pdf') {
    const risky = pdfThreats(buf)
    if (risky.length) return { ok: false, error: `PDF ditolak karena berisi ${risky.join(', ')}. Simpan ulang sebagai PDF biasa (Print → Save as PDF).` }
  } else {
    const size = imageSize(buf, mime)
    if (!size || !size.w || !size.h) return { ok: false, error: 'File gambar rusak atau tidak lengkap.' }
    if (size.w > MAX_IMAGE_SIDE || size.h > MAX_IMAGE_SIDE) return { ok: false, error: 'Resolusi gambar terlalu besar.' }
  }
  return { ok: true, buf, mime, filename: safeFilename(f.name, mime) }
}

// Konfigurasi AI screening (server-side) ada di lib/ai-config.ts (loadAiConfig / isAiEnabled):
// pengaturan dari halaman Pengaturan → Pengaturan AI menimpa .env.
