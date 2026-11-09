import { describe, expect, it } from 'vitest'
import { countByPosition, cvStats, sortForTable, suggestCandidates, type CvOverviewItem } from './cv-overview'

const ai = (percent: number, verdict: string) => ({
  percent, verdict, filled: 8, ringkasan: '', pengalaman_tahun: null, pendidikan_terakhir: '', skills: [], strengths: [], concerns: [],
})
const C = (p: Partial<CvOverviewItem>): CvOverviewItem => ({
  id: 'x', nama: 'X', posisi: 'p1', stage: 'screening', tanggal: '2026-11-01', has_cv_file: true,
  filename: 'cv.pdf', ai_status: 'done', ai_error: null, hr_done: false, ai: null, ...p,
})

describe('cvStats', () => {
  it('menghitung status CV & verdict AI', () => {
    const s = cvStats([
      C({ id: 'a', ai: ai(80, 'Lolos') }),
      C({ id: 'b', ai: ai(60, 'Pertimbangkan') }),
      C({ id: 'c', ai: ai(30, 'Tidak Lolos') }),
      C({ id: 'd', ai_status: 'processing' }),
      C({ id: 'e', ai_status: 'error' }),
      C({ id: 'f', has_cv_file: false, ai_status: null, filename: null }),
    ])
    expect(s).toMatchObject({ total: 6, noCv: 1, processing: 1, error: 1, analyzed: 3, lolos: 1, pertimbangkan: 1, tidakLolos: 1 })
  })
})

describe('suggestCandidates', () => {
  it('hanya Lolos yang masih aktif, skor tertinggi dulu', () => {
    const r = suggestCandidates([
      C({ id: 'a', nama: 'A', ai: ai(75, 'Lolos') }),
      C({ id: 'b', nama: 'B', ai: ai(90, 'Lolos') }),
      C({ id: 'c', nama: 'C', ai: ai(95, 'Lolos'), stage: 'rejected' }),
      C({ id: 'd', nama: 'D', ai: ai(65, 'Pertimbangkan') }),
    ])
    expect(r.strict).toBe(true)
    expect(r.closedLolos).toBe(1)
    expect(r.list.map(x => x.id)).toEqual(['b', 'a'])
  })
  it('tanpa Lolos: Pertimbangkan teratas sebagai cadangan', () => {
    const r = suggestCandidates([
      C({ id: 'a', ai: ai(55, 'Pertimbangkan') }),
      C({ id: 'b', ai: ai(65, 'Pertimbangkan') }),
      C({ id: 'c', ai: ai(20, 'Tidak Lolos') }),
    ], 1)
    expect(r.strict).toBe(false)
    expect(r.list.map(x => x.id)).toEqual(['b'])
  })
})

describe('sortForTable & countByPosition', () => {
  it('AI dulu, lalu menunggu analisis, lalu tanpa CV', () => {
    const r = sortForTable([
      C({ id: 'nocv', has_cv_file: false }),
      C({ id: 'wait', ai_status: 'processing' }),
      C({ id: 'lo', ai: ai(40, 'Tidak Lolos') }),
      C({ id: 'hi', ai: ai(85, 'Lolos') }),
      C({ id: 'rej', ai: ai(95, 'Lolos'), stage: 'rejected' }),
    ])
    expect(r.map(x => x.id)).toEqual(['hi', 'lo', 'wait', 'nocv', 'rej'])
  })
  it('jumlah per posisi', () => {
    expect(countByPosition([C({ posisi: 'a' }), C({ posisi: 'a' }), C({ posisi: 'b' })])).toEqual({ a: 2, b: 1 })
  })
})
