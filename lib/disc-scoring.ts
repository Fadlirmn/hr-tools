/**
 * Shared DISC scoring logic (Personal Profile System / Classical Pattern style).
 * Dipakai oleh exam-modal.tsx (preview HR), app/api/exam-submit (skor resmi
 * kandidat), dan app/hr/tes-disc/page.tsx (input manual HR) agar formula
 * konsisten di satu tempat.
 */
import {
  DISC_MOST_MAPPING, DISC_LEAST_MAPPING,
  DISC_MOST_CONVERSION_TABLE, DISC_LEAST_CONVERSION_TABLE,
  DISC_BEHAVIORAL_GRAPH,
} from './constants'
import type { DiscAnswer, DiscConversionTable, DiscGraphResult, DiscBehavioralPattern } from './types'

const DIM_ORDER: ('D' | 'I' | 'S' | 'C')[] = ['D', 'I', 'S', 'C']

function convertScore(table: DiscConversionTable, dim: 'D' | 'I' | 'S' | 'C', rawCount: number): number {
  const dimTable = table[dim]
  if (dimTable[rawCount] !== undefined) return dimTable[rawCount]
  // Fallback: cari kunci terbesar <= rawCount (tabel tidak selalu punya entri untuk setiap angka)
  const keys = Object.keys(dimTable).map(Number).sort((a, b) => a - b)
  let closest = keys[0] ?? 0
  for (const k of keys) { if (k <= rawCount) closest = k }
  return dimTable[closest] ?? 50
}

function buildGraphCode(scores: Record<'D' | 'I' | 'S' | 'C', number>): string {
  return DIM_ORDER
    .map(dim => [dim, scores[dim]] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([dim, score]) => (score > 50 ? 'H' : 'L') + dim)
    .join('')
}

function lookupPattern(code: string, scores: Record<'D' | 'I' | 'S' | 'C', number>): DiscBehavioralPattern {
  if (DISC_BEHAVIORAL_GRAPH[code]) return DISC_BEHAVIORAL_GRAPH[code]
  // Fallback: cocokkan 6 karakter pertama (2 dimensi teratas), lalu jatuh ke dimensi dominan tunggal
  const prefix = code.slice(0, 6)
  for (const key of Object.keys(DISC_BEHAVIORAL_GRAPH)) {
    if (key.startsWith(prefix)) return DISC_BEHAVIORAL_GRAPH[key]
  }
  const dominant = DIM_ORDER
    .map(dim => [dim, scores[dim]] as const)
    .sort((a, b) => b[1] - a[1])[0][0]
  const defaults: Record<'D' | 'I' | 'S' | 'C', DiscBehavioralPattern> = {
    D: { name: 'Conductor #1', type: 'D' },
    I: { name: 'Promoter #3', type: 'I' },
    S: { name: 'Supporter #5', type: 'S' },
    C: { name: 'Analyzer #7', type: 'C' },
  }
  return defaults[dominant]
}

function countByDimension(answers: Record<number, DiscAnswer>, field: 'most' | 'least', mapping: typeof DISC_MOST_MAPPING): Record<'D' | 'I' | 'S' | 'C' | 'X', number> {
  const counts: Record<'D' | 'I' | 'S' | 'C' | 'X', number> = { D: 0, I: 0, S: 0, C: 0, X: 0 }
  Object.entries(answers).forEach(([qNoStr, ans]) => {
    const qNo = Number(qNoStr)
    const letter = ans[field]
    const dim = mapping[qNo]?.[letter]
    if (dim) counts[dim]++
  })
  return counts
}

export function calcDiscGraphs(answers: Record<number, DiscAnswer>): { adapted: DiscGraphResult; natural: DiscGraphResult } {
  const mostCounts = countByDimension(answers, 'most', DISC_MOST_MAPPING)
  const leastCounts = countByDimension(answers, 'least', DISC_LEAST_MAPPING)

  const adaptedScores: Record<'D' | 'I' | 'S' | 'C', number> = {
    D: convertScore(DISC_MOST_CONVERSION_TABLE, 'D', mostCounts.D),
    I: convertScore(DISC_MOST_CONVERSION_TABLE, 'I', mostCounts.I),
    S: convertScore(DISC_MOST_CONVERSION_TABLE, 'S', mostCounts.S),
    C: convertScore(DISC_MOST_CONVERSION_TABLE, 'C', mostCounts.C),
  }
  const naturalScores: Record<'D' | 'I' | 'S' | 'C', number> = {
    D: convertScore(DISC_LEAST_CONVERSION_TABLE, 'D', leastCounts.D),
    I: convertScore(DISC_LEAST_CONVERSION_TABLE, 'I', leastCounts.I),
    S: convertScore(DISC_LEAST_CONVERSION_TABLE, 'S', leastCounts.S),
    C: convertScore(DISC_LEAST_CONVERSION_TABLE, 'C', leastCounts.C),
  }

  const adaptedCode = buildGraphCode(adaptedScores)
  const naturalCode = buildGraphCode(naturalScores)

  return {
    adapted: { scores: adaptedScores, pattern: lookupPattern(adaptedCode, adaptedScores) },
    natural: { scores: naturalScores, pattern: lookupPattern(naturalCode, naturalScores) },
  }
}
