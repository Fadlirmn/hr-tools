import { CV_CRITERIA } from './constants'
import type { CvScores, CvVerdict, CvDecision } from './types'

/** Ambang verdict (nanti bisa dibuat konfigurasi per posisi). */
export const CV_PASS_PERCENT = 75
export const CV_CONSIDER_PERCENT = 60
/** Minimal porsi bobot yang sudah dinilai agar verdict boleh keluar. */
export const CV_MIN_COVERAGE = 0.6

export interface CvScoreResult {
  /** Σ (nilai × bobot) untuk kriteria yang sudah dinilai */
  got: number
  /** Σ (5 × bobot) untuk kriteria yang sudah dinilai */
  maxFilled: number
  /** Σ (5 × bobot) untuk semua kriteria */
  max: number
  /** Skor utama: got / maxFilled, dibulatkan */
  percent: number
  /** Skor minimum: got / max (sisanya dianggap 0), dibulatkan */
  floor: number
  filled: number
  verdict: CvVerdict
}

const isRated = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5

/**
 * Skor CV tertimbang — dipakai form HR, endpoint simpan, dan screening AI supaya
 * angka AI dan HR selalu sebanding. Kriteria yang belum dinilai / "tidak ada info"
 * dibiarkan kosong dan TIDAK dihitung 0.
 */
export function calcCvScore(scores: CvScores | null | undefined, weights: Record<string, number>): CvScoreResult {
  let got = 0, max = 0, maxFilled = 0, filled = 0
  for (const cr of CV_CRITERIA) {
    const w = weights[cr.id] || 1
    max += 5 * w
    const v = scores?.[cr.id]
    if (isRated(v)) { got += v * w; maxFilled += 5 * w; filled++ }
  }
  const percent = maxFilled ? Math.round(got / maxFilled * 100) : 0
  const floor = max ? Math.round(got / max * 100) : 0
  return { got, maxFilled, max, percent, floor, filled, verdict: cvVerdict(percent, maxFilled, max) }
}

/** Verdict memakai `percent` yang sudah dibulatkan (sama dengan yang tampil). */
export function cvVerdict(percent: number, maxFilled: number, max: number): CvVerdict {
  if (!max || maxFilled / max < CV_MIN_COVERAGE) return 'Data belum cukup'
  if (percent >= CV_PASS_PERCENT) return 'Lolos'
  if (percent >= CV_CONSIDER_PERCENT) return 'Pertimbangkan'
  return 'Tidak Lolos'
}

/** Saran keputusan dari verdict; null untuk "Data belum cukup". */
export function suggestDecision(verdict: string): CvDecision | null {
  if (verdict === 'Lolos') return 'lanjut'
  if (verdict === 'Pertimbangkan') return 'tahan'
  if (verdict === 'Tidak Lolos') return 'tolak'
  return null
}

export function defaultWeights(): Record<string, number> {
  return Object.fromEntries(CV_CRITERIA.map(x => [x.id, 2]))
}
