import { CV_DECISIONS } from './constants'
import type { CandidateStage, CvDecision } from './types'

/** Tahap di mana keputusan Penilaian CV boleh menggeser tahap kandidat. */
export const CV_PHASE_STAGES: string[] = ['screening', 'psikotes', 'hold', 'rejected']

/**
 * Tahap setelah keputusan CV. Kandidat yang sudah lewat fase CV (interview dst.)
 * tidak ditarik mundur — tahapnya dibiarkan.
 */
export function stageAfterDecision(current: string, decision: CvDecision): CandidateStage {
  if (!CV_PHASE_STAGES.includes(current)) return current as CandidateStage
  return CV_DECISIONS.find(d => d.id === decision)!.stage
}

export interface QueueItem { id: string; hasCv: boolean; assessed: boolean }

/**
 * Kandidat berikutnya yang punya CV dan belum dinilai HR, mengikuti urutan daftar
 * kandidat dan berputar ke awal. Kandidat saat ini tidak pernah dipilih.
 */
export function pickNextCandidate(list: QueueItem[], currentId: string): string | null {
  const n = list.length
  const start = list.findIndex(x => x.id === currentId)
  for (let i = 1; i <= n; i++) {
    const it = list[(start + i + n) % n]
    if (it.id !== currentId && it.hasCv && !it.assessed) return it.id
  }
  return null
}
