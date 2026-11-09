// Status akses tes online (DISC/IQ) per kandidat — fungsi murni.
import type { Candidate } from './types'

export type AccessStatus = 'belum' | 'aktif' | 'kadaluarsa' | 'selesai'
export type TestType = 'disc' | 'iq'

export const ACCESS_LABEL: Record<AccessStatus, { text: string; cls: string }> = {
  belum: { text: 'Belum Dibuka', cls: 'neutral' },
  aktif: { text: 'Aktif', cls: 'ok' },
  kadaluarsa: { text: 'Kadaluarsa', cls: 'no' },
  selesai: { text: 'Selesai', cls: 'hold' },
}

export function computeStatus(hasResult: boolean, openAt: string | null, closeAt: string | null, now = new Date()): AccessStatus {
  if (hasResult) return 'selesai'
  if (!openAt || !closeAt) return 'belum'
  return new Date(closeAt) < now ? 'kadaluarsa' : 'aktif'
}

export function testStatus(c: Pick<Candidate, 'psikotes_result' | 'disc_open_at' | 'disc_close_at' | 'iq_open_at' | 'iq_close_at'>, type: TestType, now = new Date()): AccessStatus {
  return type === 'disc'
    ? computeStatus(!!c.psikotes_result?.disc, c.disc_open_at, c.disc_close_at, now)
    : computeStatus(!!c.psikotes_result?.iq, c.iq_open_at, c.iq_close_at, now)
}

/** Kolom akses yang dikosongkan / diisi untuk satu jenis tes. */
export const accessFields = (type: TestType, openAt: string | null, closeAt: string | null, timeLimit: number | null) =>
  type === 'disc'
    ? { disc_open_at: openAt, disc_close_at: closeAt, disc_time_limit: timeLimit, disc_started_at: null }
    : { iq_open_at: openAt, iq_close_at: closeAt, iq_time_limit: timeLimit, iq_started_at: null }
