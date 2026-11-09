import { describe, expect, it } from 'vitest'
import { stageAfterInterview, stageAfterTest } from './stages'

describe('stageAfterInterview', () => {
  it('mengikuti rekomendasi', () => {
    expect(stageAfterInterview('interview', 'Lanjut ke offering')).toBe('offer')
    expect(stageAfterInterview('interview', 'Interview tahap 2')).toBe('interview')
    expect(stageAfterInterview('interview', 'Tahan / pertimbangkan')).toBe('hold')
    expect(stageAfterInterview('interview', 'Tidak dilanjutkan')).toBe('rejected')
  })
  it('tidak mengubah kandidat yang sudah onboarding/diterima', () => {
    expect(stageAfterInterview('onboarding', 'Tidak dilanjutkan')).toBe('onboarding')
    expect(stageAfterInterview('hired', 'Lanjut ke offering')).toBe('hired')
  })
  it('rekomendasi tak dikenal: tahap tetap', () => {
    expect(stageAfterInterview('interview', 'lainnya')).toBe('interview')
  })
})

describe('stageAfterTest', () => {
  it('maju ke interview hanya dari screening/psikotes', () => {
    expect(stageAfterTest('screening')).toBe('interview')
    expect(stageAfterTest('psikotes')).toBe('interview')
    for (const s of ['rejected', 'hired', 'hold', 'offer', 'interview', 'onboarding'] as const) expect(stageAfterTest(s)).toBe(s)
  })
})
