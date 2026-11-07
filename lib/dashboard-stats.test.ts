import { describe, it, expect } from 'vitest'
import { buildTasks, buildStats } from './dashboard-stats'
import type { Candidate } from './types'

const C = (o: Partial<Candidate>) => ({ id: 'x', nama: 'X', posisi: 'marketing', sumber: 'Glints', stage: 'screening', cv: null, interview: null, psikotes_result: null,
  disc_open_at: null, disc_close_at: null, iq_open_at: null, iq_close_at: null, ...o }) as Candidate
const NOW = new Date('2026-11-07T10:00:00Z')
const pos = () => 'Marketing'
const cvA = { percent: 79, verdict: 'Lolos' } as Candidate['cv']
const disc = { disc: { adapted: { pattern: { type: 'DI' } } }, iq: null } as unknown as Candidate['psikotes_result']

describe('buildTasks', () => {
  it('memetakan kandidat ke antrian kerja yang tepat', () => {
    const t = buildTasks([
      C({ id: 'a', has_cv_file: true, ai_percent: 70 }),
      C({ id: 'b', has_cv_file: true, ai_status: 'error' }),
      C({ id: 'c', has_cv_file: true, cv: cvA, stage: 'hold' }),
      C({ id: 'd', stage: 'psikotes', cv: cvA, psikotes_result: disc }),
      C({ id: 'e', stage: 'psikotes', disc_open_at: '2026-11-06T00:00:00Z', disc_close_at: '2026-11-09T00:00:00Z' }),
      C({ id: 'f', stage: 'psikotes', iq_open_at: '2026-11-01T00:00:00Z', iq_close_at: '2026-11-03T00:00:00Z' }),
      C({ id: 'g', stage: 'rejected', iq_open_at: '2026-11-01T00:00:00Z', iq_close_at: '2026-11-03T00:00:00Z' }),
    ], pos, NOW)
    const by = (k: string) => t.filter(x => x.kind === k).map(x => x.id)
    expect(by('cv')).toEqual(['a'])
    expect(t.find(x => x.id === 'a')!.meta).toBe('Draft AI 70%')
    expect(by('ai_error')).toEqual(['b'])
    expect(by('hold')).toEqual(['c'])
    expect(by('interview')).toEqual(['d'])
    expect(by('test_pending')).toEqual(['e'])
    expect(by('test_expired')).toEqual(['f']) // g ditolak → tidak masuk antrian
    expect(t.find(x => x.id === 'a')!.href).toBe('/hr/cv?candidateId=a')
  })
})

describe('buildStats', () => {
  it('menghitung statistik, funnel, dan sumber', () => {
    const s = buildStats([
      C({ id: '1', has_cv_file: true, sumber: 'Glints', ai_percent: 60 }),
      C({ id: '2', stage: 'hold', sumber: 'Glints', cv: cvA }),
      C({ id: '3', stage: 'rejected', sumber: 'KitaLulus' }),
      C({ id: '4', stage: 'hired', sumber: '' }),
    ])
    expect(s).toMatchObject({ total: 4, active: 2, cvTodo: 1, hold: 1, hired: 1, rejected: 1 })
    expect(s.funnel.find(f => f.stage === 'hold')!.n).toBe(1)
    expect(s.sumber[0]).toEqual({ name: 'Glints', n: 2, avg: 70 })
    expect(s.sumber.find(x => x.name === 'Lainnya')).toBeTruthy()
  })
})
