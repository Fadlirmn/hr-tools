import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { toCandidateView, isHrRole } from '@/lib/candidate-public'
import type { Candidate } from '@/lib/types'

// GET /api/candidates/by-user?userId=... — kandidat hanya boleh baca data
// miliknya sendiri; hr/dev boleh baca siapa saja (dipakai juga di beberapa
// halaman HR yang perlu lookup berdasar user_id).
// Non-HR (kandidat) menerima versi tersaring (toCandidateView): penilaian CV
// HR diganti status { reviewed, date } — skor/verdict/keputusan tidak dikirim.
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  if (user.role === 'candidate' && user.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = await query('SELECT * FROM candidates WHERE user_id = $1 LIMIT 1', [userId])
  const row = (res.rows[0] as Candidate | undefined) ?? null
  return NextResponse.json({ candidate: isHrRole(user.role) ? row : toCandidateView(row) })
}
