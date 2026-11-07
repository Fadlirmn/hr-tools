import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/pg'
import { toCandidateView } from '@/lib/candidate-public'
import type { Candidate } from '@/lib/types'

// GET /api/invite-candidate?token=... — PUBLIC, dipakai halaman /invite/[token]
// sebelum user punya akun/session. Hanya mengembalikan kandidat yang
// invite_token-nya cocok dan belum pernah di-claim (user_id masih NULL) —
// setara kebijakan RLS "anon_candidates_read_invite" di Supabase lama.
// Selalu disaring (toCandidateView) — endpoint publik tidak boleh membocorkan
// penilaian CV HR.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const res = await query(
    'SELECT * FROM candidates WHERE invite_token = $1 AND user_id IS NULL LIMIT 1',
    [token]
  )
  return NextResponse.json({ candidate: toCandidateView(res.rows[0] as Candidate | undefined) })
}
