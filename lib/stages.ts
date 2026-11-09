// Perpindahan tahap kandidat otomatis — fungsi murni.
import type { CandidateStage } from './types'

/** Rekomendasi di form Interview, urutan sesuai tampilan. */
export const INTERVIEW_RECS = ['Lanjut ke offering', 'Interview tahap 2', 'Tahan / pertimbangkan', 'Tidak dilanjutkan'] as const

const REC_STAGE: Record<string, CandidateStage> = {
  'Lanjut ke offering': 'offer',
  'Interview tahap 2': 'interview',
  'Tahan / pertimbangkan': 'hold',
  'Tidak dilanjutkan': 'rejected',
}

/** Tahap setelah interview disimpan: ikut rekomendasi, kecuali kandidat sudah onboarding/diterima. */
export function stageAfterInterview(stage: CandidateStage, rec: string): CandidateStage {
  if (stage === 'onboarding' || stage === 'hired') return stage
  return REC_STAGE[rec] ?? stage
}

/** Tahap setelah hasil tes DISC/IQ disimpan: maju ke interview hanya dari screening/psikotes. */
export function stageAfterTest(stage: CandidateStage): CandidateStage {
  return stage === 'screening' || stage === 'psikotes' ? 'interview' : stage
}
