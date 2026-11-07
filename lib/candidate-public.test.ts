import { describe, it, expect } from 'vitest'
import { toCandidateView, toCvView, isHrRole } from './candidate-public'
import type { Candidate, CvAssessment } from './types'

const cv: CvAssessment = {
  scores: { exp: 4, skill: 2 }, got: 6, max: 10, percent: 60, floor: 50, verdict: 'Pertimbangkan',
  filled: 2, notes: 'catatan rahasia HR', date: '2026-11-01', position_id: 'p1',
  weights_snapshot: { exp: 3 }, decision: 'tolak', reject_reason: 'Pengalaman kurang',
  assessed_by: 'hr@x.id', assessed_at: '2026-11-02T10:00:00Z',
}

const row = {
  id: 'c1', user_id: 'u1', nama: 'Budi', posisi: 'p1', sumber: 'web', email: 'b@x.id', telepon: '08',
  catatan: 'internal HR', stage: 'rejected', tanggal: '2026-10-30', invite_token: null, cv,
  psikotes: null, psikotes_open_at: null, psikotes_close_at: null, psikotes_time_limit: null,
  psikotes_result: null, disc_open_at: null, disc_close_at: null, disc_time_limit: null, disc_started_at: null,
  iq_open_at: null, iq_close_at: null, iq_time_limit: null, iq_started_at: null,
  interview: { scores: { a: 4 }, avg: 4, verdict: 'Baik', filled: 1, by: 'HR', rec: 'lanjut', notes: 'n', date: 'd' },
  onboarding: null, has_cv_file: true, ai_percent: 70, ai_status: 'done',
} as Candidate

describe('toCandidateView', () => {
  it('mengganti cv dengan status tinjauan saja', () => {
    expect(toCandidateView(row).cv).toEqual({ reviewed: true, date: '2026-11-02T10:00:00Z' })
  })
  it('tidak membocorkan skor/verdict/keputusan/alasan/catatan di mana pun', () => {
    const json = JSON.stringify(toCandidateView(row))
    for (const leak of ['catatan rahasia HR', 'Pengalaman kurang', 'Pertimbangkan', 'weights_snapshot',
      'reject_reason', 'decision', 'percent', 'scores":{"exp', 'hr@x.id', 'internal HR', 'ai_percent', 'has_cv_file', 'ai_status']) {
      expect(json).not.toContain(leak)
    }
  })
  it('cv null jika belum dinilai', () => {
    expect(toCandidateView({ ...row, cv: null }).cv).toBeNull()
  })
  it('mempertahankan field yang dibutuhkan halaman kandidat', () => {
    const v = toCandidateView(row)
    expect(v).toMatchObject({ id: 'c1', user_id: 'u1', nama: 'Budi', posisi: 'p1', stage: 'rejected', email: 'b@x.id', catatan: '' })
    expect(v.interview).toEqual(row.interview)
  })
  it('tidak memutasi baris asli', () => {
    toCandidateView(row)
    expect(row.cv).toBe(cv)
    expect(row.catatan).toBe('internal HR')
  })
  it('null/undefined → null', () => {
    expect(toCandidateView(null)).toBeNull()
    expect(toCandidateView(undefined)).toBeNull()
  })
})

describe('toCvView', () => {
  it('fallback ke date jika assessed_at tidak ada (data lama)', () => {
    expect(toCvView({ ...cv, assessed_at: undefined })).toEqual({ reviewed: true, date: '2026-11-01' })
  })
})

describe('isHrRole', () => {
  it('hanya hr & dev', () => {
    expect(isHrRole('hr')).toBe(true)
    expect(isHrRole('dev')).toBe(true)
    expect(isHrRole('candidate')).toBe(false)
    expect(isHrRole(undefined)).toBe(false)
  })
})

import { describe as d2, it as i2, expect as e2 } from 'vitest'
import { toCandidateView as tcv } from './candidate-public'
import type { Candidate as C2 } from './types'

d2('tahap hasil keputusan CV disamarkan', () => {
  const base = { id: 'x', nama: 'X', cv: { percent: 40, verdict: 'Tidak Lolos' }, interview: null } as unknown as C2
  i2('hold/rejected tanpa interview tampil sebagai screening', () => {
    e2(tcv({ ...base, stage: 'rejected' } as C2)!.stage).toBe('screening')
    e2(tcv({ ...base, stage: 'hold' } as C2)!.stage).toBe('screening')
  })
  i2('tahap lain dan penolakan setelah interview tidak diubah', () => {
    e2(tcv({ ...base, stage: 'psikotes' } as C2)!.stage).toBe('psikotes')
    e2(tcv({ ...base, stage: 'rejected', interview: { avg: 2 } } as unknown as C2)!.stage).toBe('rejected')
  })
})
