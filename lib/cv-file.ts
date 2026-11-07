// Validasi file CV — server-side. Hanya PDF/JPG/PNG (format yang bisa dibaca
// langsung oleh screening AI). Tipe ditentukan dari magic bytes, bukan dari
// ekstensi/Content-Type kiriman browser (keduanya bisa dipalsukan).

export const CV_MAX_BYTES = 5 * 1024 * 1024
export const CV_ACCEPT = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png'
export const CV_FORMAT_HINT = 'Format PDF, JPG, atau PNG — maks. 5 MB. File Word (.docx) silakan export ke PDF dulu.'

export type CvMime = 'application/pdf' | 'image/jpeg' | 'image/png'

export function detectCvMime(buf: Buffer): CvMime | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
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
  if (!mime) return { ok: false, error: 'Format tidak didukung. ' + CV_FORMAT_HINT }
  const filename = (f.name || 'cv').replace(/[\r\n"\\]/g, '').slice(0, 200) || 'cv'
  return { ok: true, buf, mime, filename }
}

// Konfigurasi AI screening (server-side) ada di lib/ai-config.ts (loadAiConfig / isAiEnabled):
// pengaturan dari halaman Admin → Pengaturan AI menimpa .env.
