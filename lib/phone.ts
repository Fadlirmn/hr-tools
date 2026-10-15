/**
 * Validasi nomor telepon Indonesia/internasional (longgar tapi aman).
 * Aturan: kosong = boleh (opsional, agar data lama & flow exam-modal tak rusak);
 * jika diisi: hanya digit (+ di depan, spasi/strip/kurung/titik ditoleransi),
 * digit minimal 10, maksimal 15 (batas E.164).
 */

export function phoneDigits(v: string): string {
  return (v || '').replace(/\D/g, '')
}

export function isValidPhone(v: unknown, opts?: { required?: boolean }): boolean {
  const required = opts?.required ?? false
  if (typeof v !== 'string') return !required && v == null
  const s = v.trim()
  if (!s) return !required
  // Tolak huruf — harus "pasti nomor"
  if (/[a-zA-Z]/.test(s)) return false
  // Hanya karakter telepon yang wajar
  if (!/^[+\d][\d\s\-().]*$/.test(s)) return false
  const d = phoneDigits(s)
  return d.length >= 10 && d.length <= 15
}

export const PHONE_HINT = 'No. HP minimal 10 angka (cth. 08xxxxxxxxxx).'
export const PHONE_ERROR = 'No. HP tidak valid: harus angka dan minimal 10 digit.'
