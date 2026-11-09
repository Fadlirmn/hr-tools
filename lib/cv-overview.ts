// Ringkasan CV per posisi untuk menu Upload CV — fungsi murni (tanpa DB).
import type { CandidateStage, CvAiStatus } from './types'

/** Satu baris dari GET /api/cv-screen?list=1 */
export interface CvOverviewItem {
  id: string
  nama: string
  posisi: string
  stage: CandidateStage
  tanggal: string
  has_cv_file: boolean
  filename: string | null
  ai_status: CvAiStatus | null
  ai_error: string | null
  /** Sudah dinilai HR di Penilaian CV */
  hr_done: boolean
  ai: {
    percent: number
    verdict: string
    filled: number
    ringkasan: string
    pengalaman_tahun: number | null
    pendidikan_terakhir: string
    skills: string[]
    strengths: string[]
    concerns: string[]
  } | null
}

export interface CvOverviewStats {
  total: number
  noCv: number
  processing: number
  error: number
  analyzed: number
  lolos: number
  pertimbangkan: number
  tidakLolos: number
  kurangData: number
}

const CLOSED: CandidateStage[] = ['rejected', 'hired']

export function cvStats(items: CvOverviewItem[]): CvOverviewStats {
  const s: CvOverviewStats = { total: items.length, noCv: 0, processing: 0, error: 0, analyzed: 0, lolos: 0, pertimbangkan: 0, tidakLolos: 0, kurangData: 0 }
  for (const x of items) {
    if (!x.has_cv_file) { s.noCv++; continue }
    if (x.ai_status === 'processing') s.processing++
    else if (x.ai_status === 'error') s.error++
    if (!x.ai) continue
    s.analyzed++
    if (x.ai.verdict === 'Lolos') s.lolos++
    else if (x.ai.verdict === 'Pertimbangkan') s.pertimbangkan++
    else if (x.ai.verdict === 'Tidak Lolos') s.tidakLolos++
    else s.kurangData++
  }
  return s
}

/**
 * Kandidat yang disarankan AI: verdict "Lolos", belum ditolak/diterima, skor tertinggi dulu.
 * Bila tidak ada yang Lolos, tampilkan "Pertimbangkan" teratas (maks. `fallback`).
 */
export function suggestCandidates(items: CvOverviewItem[], fallback = 3): { list: CvOverviewItem[]; strict: boolean; closedLolos: number } {
  const closedLolos = items.filter(x => x.ai?.verdict === 'Lolos' && CLOSED.includes(x.stage)).length
  const open = items.filter(x => x.ai && !CLOSED.includes(x.stage))
  const byScore = (a: CvOverviewItem, b: CvOverviewItem) => b.ai!.percent - a.ai!.percent || a.nama.localeCompare(b.nama)
  const lolos = open.filter(x => x.ai!.verdict === 'Lolos').sort(byScore)
  if (lolos.length) return { list: lolos, strict: true, closedLolos }
  return { list: open.filter(x => x.ai!.verdict === 'Pertimbangkan').sort(byScore).slice(0, fallback), strict: false, closedLolos }
}

/** Urutan tabel: skor AI tertinggi, lalu yang sedang/belum dianalisis, lalu tanpa CV; yang sudah ditolak/diterima paling bawah. */
export function sortForTable(items: CvOverviewItem[]): CvOverviewItem[] {
  const rank = (x: CvOverviewItem) => (CLOSED.includes(x.stage) ? 3 : 0) + (x.ai ? 0 : x.has_cv_file ? 1 : 2)
  return [...items].sort((a, b) => rank(a) - rank(b) || (b.ai?.percent ?? 0) - (a.ai?.percent ?? 0) || b.tanggal.localeCompare(a.tanggal))
}

/** Jumlah kandidat per posisi (id posisi → jumlah). */
export function countByPosition(items: CvOverviewItem[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const x of items) m[x.posisi] = (m[x.posisi] || 0) + 1
  return m
}
