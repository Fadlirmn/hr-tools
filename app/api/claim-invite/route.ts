import { NextResponse, type NextRequest } from 'next/server'
import { query, pool } from '@/lib/pg'
import { hashPassword, setSession } from '@/lib/auth'

/**
 * POST /api/claim-invite
 * Body: { candidateId: string, email: string, password: string, inviteToken: string }
 *
 * Menggantikan Supabase signUp + claim-invite 2-step lama dengan satu
 * operasi: buat user baru di tabel `users`, hubungkan ke candidates.user_id,
 * lalu langsung login (set session cookie).
 *
 * SECURITY: hanya mau proses jika invite_token cocok dan candidate belum di-claim.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const { candidateId, email, password, inviteToken } = body as {
    candidateId?: string
    email?: string
    password?: string
    inviteToken?: string
  }

  if (!candidateId || !email || !password || !inviteToken) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()

  // Verifikasi kandidat: harus cocok invite_token dan belum di-claim
  const candRes = await query<{ id: string; user_id: string | null; invite_token: string | null }>(
    'SELECT id, user_id, invite_token FROM candidates WHERE id = $1 LIMIT 1',
    [candidateId]
  )
  const candidate = candRes.rows[0]

  if (!candidate) {
    return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 })
  }
  if (candidate.user_id !== null) {
    return NextResponse.json({ error: 'Undangan sudah pernah digunakan' }, { status: 409 })
  }
  if (candidate.invite_token !== inviteToken) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 403 })
  }

  // Cek email belum terdaftar
  const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [cleanEmail])
  if (existing.rowCount! > 0) {
    return NextResponse.json({ error: 'Email ini sudah terdaftar. Gunakan email lain atau hubungi HR.' }, { status: 409 })
  }

  // Buat user baru + hubungkan ke candidate, dalam satu transaksi
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const userRes = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, nama) VALUES ($1, $2, 'candidate', $3) RETURNING id`,
      [cleanEmail, hashPassword(password), '']
    )
    const userId = userRes.rows[0].id

    await client.query(
      `UPDATE candidates SET user_id = $1, email = $2, invite_token = NULL WHERE id = $3`,
      [userId, cleanEmail, candidateId]
    )

    await client.query('COMMIT')

    await setSession(userId, 'candidate')
    return NextResponse.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[claim-invite] error:', err)
    return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 })
  } finally {
    client.release()
  }
}
