import { describe, it, expect } from 'vitest'
import { calcCvScore, cvVerdict, suggestDecision, CV_PASS_PERCENT, CV_CONSIDER_PERCENT } from './cv-score'
import { CV_CRITERIA } from './constants'
import type { CvScores } from './types'

// Bobot default posisi Marketing (spesifikasi bagian 3), total bobot 20 → max 100
const W = { exp: 3, skill: 3, portfolio: 2, achiev: 2, edu: 1, stability: 2, fit: 2, salary: 2, cvquality: 1, soft: 2 }

describe('calcCvScore — kasus uji spesifikasi', () => {
  it('Draft AI Budi (fit & salary kosong)', () => {
    const r = calcCvScore({ exp: 4, skill: 5, portfolio: 3, achiev: 5, edu: 4, stability: 3, cvquality: 4, soft: 3 }, W)
    expect(r).toMatchObject({ got: 63, maxFilled: 80, max: 100, percent: 79, floor: 63, filled: 8, verdict: 'Lolos' })
  })

  it('Draft AI Sari (fit kosong)', () => {
    const r = calcCvScore({ exp: 3, skill: 4, portfolio: 5, achiev: 3, edu: 3, stability: 4, salary: 4, cvquality: 5, soft: 4 }, W)
    expect(r).toMatchObject({ got: 69, maxFilled: 90, percent: 77, floor: 69, filled: 9, verdict: 'Lolos' })
  })

  it('Satu kriteria saja → Data belum cukup', () => {
    const r = calcCvScore({ exp: 5 }, W)
    expect(r).toMatchObject({ got: 15, maxFilled: 15, percent: 100, floor: 15, filled: 1, verdict: 'Data belum cukup' })
  })

  it('Semua kosong → 0 dan Data belum cukup', () => {
    const r = calcCvScore({}, W)
    expect(r).toMatchObject({ got: 0, maxFilled: 0, percent: 0, floor: 0, filled: 0, verdict: 'Data belum cukup' })
    expect(calcCvScore(null, W).percent).toBe(0)
  })

  it('kriteria kosong tidak dihitung 0, nilai di luar 1–5 diabaikan', () => {
    const a = calcCvScore({ exp: 4, skill: 4, portfolio: 4, achiev: 4, stability: 4, fit: 4 }, W)
    const b = calcCvScore({ exp: 4, skill: 4, portfolio: 4, achiev: 4, stability: 4, fit: 4, salary: 0, soft: 9 } as CvScores, W)
    expect(a.percent).toBe(80)
    expect(b).toEqual(a)
  })
})

/** Isi semua kriteria (cakupan 100%) sampai got = target (maxFilled = 100). */
function scoresWithGot(target: number): CvScores {
  const s: CvScores = Object.fromEntries(CV_CRITERIA.map(c => [c.id, 1]))
  let got = 20
  // naikkan kriteria berbobot besar dulu, lalu bobot 1 untuk sisa ganjil
  const order = [...CV_CRITERIA].sort((a, b) => W[b.id as keyof typeof W] - W[a.id as keyof typeof W])
  for (const c of order) {
    const w = W[c.id as keyof typeof W]
    while (s[c.id] < 5 && got + w <= target) { s[c.id]++; got += w }
  }
  if (got !== target) throw new Error('target tidak tercapai: ' + target)
  return s
}

describe('batas verdict (percent)', () => {
  it.each([
    [59, 'Tidak Lolos'],
    [60, 'Pertimbangkan'],
    [74, 'Pertimbangkan'],
    [75, 'Lolos'],
  ])('percent %i → %s', (p, v) => {
    const r = calcCvScore(scoresWithGot(p), W)
    expect(r.percent).toBe(p)
    expect(r.verdict).toBe(v)
  })

  it('verdict memakai angka percent yang sudah dibulatkan', () => {
    expect(cvVerdict(Math.round(74.5), 60, 100)).toBe('Lolos') // 74,5 dibulatkan 75
    expect(cvVerdict(Math.round(59.5), 60, 100)).toBe('Pertimbangkan')
    expect(CV_PASS_PERCENT).toBe(75)
    expect(CV_CONSIDER_PERCENT).toBe(60)
  })
})

describe('batas cakupan bobot 59% vs 60%', () => {
  // exp 59 + skill 33 + 8 kriteria lain bobot 1 → total bobot 100
  const W2 = { exp: 59, skill: 33 }
  it('59% bobot dinilai → Data belum cukup', () => {
    const r = calcCvScore({ exp: 5 }, W2)
    expect(r.maxFilled / r.max).toBeCloseTo(0.59)
    expect(r.verdict).toBe('Data belum cukup')
  })
  it('60% bobot dinilai → verdict keluar', () => {
    const r = calcCvScore({ exp: 5, edu: 5 }, W2)
    expect(r.maxFilled / r.max).toBeCloseTo(0.6)
    expect(r.verdict).toBe('Lolos')
  })
  it('bobot default: 12/20 cukup, 11/20 belum', () => {
    expect(calcCvScore({ exp: 3, skill: 3, portfolio: 3, achiev: 3, edu: 3 }, W).verdict).toBe('Data belum cukup') // 11
    expect(calcCvScore({ exp: 3, skill: 3, portfolio: 3, achiev: 3, edu: 3, cvquality: 3 }, W).verdict).toBe('Pertimbangkan') // 12
  })
})

describe('suggestDecision', () => {
  it('memetakan verdict ke saran keputusan', () => {
    expect(suggestDecision('Lolos')).toBe('lanjut')
    expect(suggestDecision('Pertimbangkan')).toBe('tahan')
    expect(suggestDecision('Tidak Lolos')).toBe('tolak')
    expect(suggestDecision('Data belum cukup')).toBeNull()
  })
})
