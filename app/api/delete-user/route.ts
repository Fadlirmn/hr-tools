import { NextResponse } from 'next/server'
import { query } from '@/lib/pg'
import { getSessionUser } from '@/lib/auth'
import { errorMessage } from '@/lib/errors'

const RATE_LIMIT = 10
const RATE_WINDOW = 60000
const hitCount = new Map<string, { n: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = hitCount.get(ip)
  if (!entry || now > entry.reset) {
    hitCount.set(ip, { n: 1, reset: now + RATE_WINDOW })
    return true
  }
  if (entry.n >= RATE_LIMIT) return false
  entry.n++
  return true
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'hr' && user.role !== 'dev') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { candidateId } = await req.json()
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const candRes = await query<{ user_id: string | null }>('SELECT user_id FROM candidates WHERE id = $1 LIMIT 1', [candidateId])
  const userId = candRes.rows[0]?.user_id

  // ON DELETE CASCADE/SET NULL tidak dipasang untuk users->candidates agar
  // penghapusan kandidat tidak otomatis menghapus akun user; hapus manual di
  // sini supaya akun login kandidat ikut hilang saat kandidat dihapus HR.
  if (userId) {
    await query('DELETE FROM users WHERE id = $1', [userId])
  }

  try {
    await query('DELETE FROM candidates WHERE id = $1', [candidateId])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
