import { describe, expect, it } from 'vitest'
import { computeStatus, testStatus } from './test-access'

const now = new Date('2026-11-09T10:00:00Z')

describe('computeStatus', () => {
  it('selesai bila ada hasil', () => expect(computeStatus(true, null, null, now)).toBe('selesai'))
  it('belum bila akses kosong', () => expect(computeStatus(false, null, null, now)).toBe('belum'))
  it('aktif / kadaluarsa menurut batas waktu', () => {
    expect(computeStatus(false, '2026-11-08T00:00:00Z', '2026-11-10T00:00:00Z', now)).toBe('aktif')
    expect(computeStatus(false, '2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z', now)).toBe('kadaluarsa')
  })
})

describe('testStatus', () => {
  it('membaca hasil & akses sesuai jenis tes', () => {
    const c = { psikotes_result: { disc: {} as never, iq: null }, disc_open_at: null, disc_close_at: null, iq_open_at: '2026-11-08T00:00:00Z', iq_close_at: '2026-11-10T00:00:00Z' }
    expect(testStatus(c, 'disc', now)).toBe('selesai')
    expect(testStatus(c, 'iq', now)).toBe('aktif')
  })
})
