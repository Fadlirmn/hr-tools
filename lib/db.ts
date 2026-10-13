/**
 * Client-side data helpers. Semua akses candidates sekarang wajib lewat
 * server API (bukan DB client langsung di browser) — tidak ada lagi RLS
 * untuk membatasi akses, jadi Route Handler-lah yang jadi satu-satunya
 * penjaga akses data.
 */
import type { Candidate, Position } from './types'
import { POSITIONS_DEFAULT } from './constants'

export async function getPositions(): Promise<Position[]> {
  const res = await fetch('/api/positions', { credentials: 'include' })
  if (!res.ok) return JSON.parse(JSON.stringify(POSITIONS_DEFAULT))
  const data = await res.json()
  return data.positions?.length > 0 ? data.positions : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))
}

export async function getCandidateByUserId(userId: string): Promise<Candidate | null> {
  const res = await fetch(`/api/candidates/by-user?userId=${encodeURIComponent(userId)}`, { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json()
  return data.candidate ?? null
}

export async function getCandidateByInviteToken(token: string): Promise<Candidate | null> {
  const res = await fetch(`/api/invite-candidate?token=${encodeURIComponent(token)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.candidate ?? null
}
