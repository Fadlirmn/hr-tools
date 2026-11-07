import type { Candidate, CandidateCvView, CandidateView } from './types'

/**
 * Proyeksi baris `candidates` untuk respons yang dibaca KANDIDAT (atau publik,
 * mis. halaman undangan). Penilaian CV oleh HR (skor, persen, verdict,
 * keputusan, alasan tolak, catatan, bobot, penilai) TIDAK boleh sampai ke
 * kandidat — yang tersisa hanya status "sudah ditinjau HR" + tanggalnya.
 * `catatan` (catatan internal HR saat input kandidat) dikosongkan.
 *
 * `interview` sengaja dibiarkan: halaman /candidate/hasil-interview memang
 * menampilkan hasil wawancara (skor, pewawancara, catatan) ke kandidat.
 *
 * Pure function — dipakai di route handler; HR/dev tetap menerima baris utuh.
 */
const HR_ONLY_KEYS = ['has_cv_file', 'ai_percent', 'ai_status'] as const

export function toCandidateView(row: Candidate): CandidateView
export function toCandidateView(row: Candidate | null | undefined): CandidateView | null
export function toCandidateView(row: Candidate | null | undefined): CandidateView | null {
  if (!row) return null
  const out: Record<string, unknown> = { ...row }
  // Buang juga field turunan HR-only bila kebetulan ikut (mis. dari JOIN).
  for (const k of HR_ONLY_KEYS) delete out[k]
  out.catatan = ''
  out.cv = toCvView(row.cv)
  // Keputusan Tahan / Tidak lanjut dari fase CV jangan terbaca dari tahap: selama belum
  // interview, kandidat tetap melihat "Screening CV" sampai HR menghubungi langsung.
  if ((row.stage === 'hold' || row.stage === 'rejected') && !row.interview) out.stage = 'screening'
  return out as unknown as CandidateView
}

export function toCvView(cv: Candidate['cv'] | undefined): CandidateCvView | null {
  if (!cv) return null
  return { reviewed: true, date: cv.assessed_at || cv.date || null }
}

export const isHrRole = (role?: string | null) => role === 'hr' || role === 'dev'
