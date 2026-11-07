/**
 * Client-side data helpers. Semua akses candidates sekarang wajib lewat
 * server API (bukan DB client langsung di browser) — tidak ada lagi RLS
 * untuk membatasi akses, jadi Route Handler-lah yang jadi satu-satunya
 * penjaga akses data.
 */
import type { Candidate, CandidateView, Position } from './types'
import { POSITIONS_DEFAULT } from './constants'

export async function getPositions(): Promise<Position[]> {
  const res = await fetch('/api/positions', { credentials: 'include' })
  if (!res.ok) return JSON.parse(JSON.stringify(POSITIONS_DEFAULT))
  const data = await res.json()
  return data.positions?.length > 0 ? data.positions : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))
}

async function fetchCandidateByUserId(userId: string): Promise<unknown> {
  const res = await fetch(`/api/candidates/by-user?userId=${encodeURIComponent(userId)}`, { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json()
  return data.candidate ?? null
}

/**
 * Data kandidat milik user yang login (halaman /candidate/*). Untuk role
 * candidate, server menyaring baris lewat toCandidateView: `cv` hanya berisi
 * status tinjauan `{ reviewed, date }` — tanpa skor/verdict/keputusan HR.
 */
export async function getCandidateViewByUserId(userId: string): Promise<CandidateView | null> {
  return (await fetchCandidateByUserId(userId)) as CandidateView | null
}

/**
 * @deprecated Pakai getCandidateViewByUserId di halaman kandidat. Saat dipanggil
 * oleh role candidate, `cv` yang diterima BUKAN CvAssessment melainkan
 * CandidateCvView ({ reviewed, date }) — jangan akses cv.percent/verdict dll.
 * Tipe Candidate dipertahankan sementara agar halaman lama tetap terkompilasi.
 */
export async function getCandidateByUserId(userId: string): Promise<Candidate | null> {
  return (await fetchCandidateByUserId(userId)) as Candidate | null
}

// Endpoint publik — selalu tersaring (cv = { reviewed, date } | null).
export async function getCandidateByInviteToken(token: string): Promise<Candidate | null> {
  const res = await fetch(`/api/invite-candidate?token=${encodeURIComponent(token)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.candidate ?? null
}
