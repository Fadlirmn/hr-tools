import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/claim-invite
 * Body: { candidateId: string, userId: string, email: string, inviteToken: string }
 *
 * Menggunakan service role key untuk menghubungkan user_id ke kandidat
 * setelah signUp berhasil, tanpa terhalang RLS policy.
 *
 * SECURITY: hanya mau update jika:
 *   - invite_token cocok dengan candidateId yang dikirim
 *   - user_id kandidat masih NULL (belum pernah di-claim)
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { candidateId, userId, email, inviteToken } = body as {
    candidateId?: string
    userId?: string
    email?: string
    inviteToken?: string
  }

  if (!candidateId || !userId || !email || !inviteToken) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[claim-invite] Missing Supabase env vars')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // Verifikasi kandidat: harus cocok invite_token dan belum di-claim
  const { data: candidate, error: fetchErr } = await supabase
    .from('candidates')
    .select('id, user_id, invite_token')
    .eq('id', candidateId)
    .single()

  if (fetchErr || !candidate) {
    return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 })
  }

  if (candidate.user_id !== null) {
    return NextResponse.json({ error: 'Undangan sudah pernah digunakan' }, { status: 409 })
  }

  if (candidate.invite_token !== inviteToken) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 403 })
  }

  // Lakukan update: hubungkan user_id, update email, hapus invite_token
  const { error: updateErr } = await supabase
    .from('candidates')
    .update({ user_id: userId, email: email.trim(), invite_token: null })
    .eq('id', candidateId)

  if (updateErr) {
    console.error('[claim-invite] Update error:', updateErr)
    return NextResponse.json({ error: 'Gagal menghubungkan akun' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
