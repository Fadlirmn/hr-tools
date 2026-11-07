import { describe, it, expect } from 'vitest'
import { pickNextCandidate, stageAfterDecision } from './cv-queue'

const L = [
  { id: 'a', hasCv: true, assessed: false },
  { id: 'b', hasCv: false, assessed: false },
  { id: 'c', hasCv: true, assessed: true },
  { id: 'd', hasCv: true, assessed: false },
]

describe('pickNextCandidate', () => {
  it('melewati yang tanpa CV atau sudah dinilai', () => expect(pickNextCandidate(L, 'a')).toBe('d'))
  it('berputar ke awal', () => expect(pickNextCandidate(L, 'd')).toBe('a'))
  it('null jika tidak ada lagi', () => expect(pickNextCandidate(L.map(x => ({ ...x, assessed: x.id !== 'a' })), 'a')).toBeNull())
  it('id tidak ada di daftar → mulai dari awal', () => expect(pickNextCandidate(L, 'zzz')).toBe('a'))
})

describe('stageAfterDecision', () => {
  it('memetakan keputusan di fase CV', () => {
    expect(stageAfterDecision('screening', 'lanjut')).toBe('psikotes')
    expect(stageAfterDecision('screening', 'tahan')).toBe('hold')
    expect(stageAfterDecision('hold', 'tolak')).toBe('rejected')
  })
  it('tidak menarik mundur kandidat yang sudah lewat fase CV', () => {
    expect(stageAfterDecision('interview', 'tahan')).toBe('interview')
  })
})
