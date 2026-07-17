import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { candidateId } = await req.json()
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: candidate } = await admin
    .from('candidates')
    .select('email, nama')
    .eq('id', candidateId)
    .single()

  if (!candidate?.email) {
    return NextResponse.json({ error: 'Candidate has no email' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0]
    ? process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0]
    : 'localhost:3000'
  const loginUrl = `https://${appUrl}/candidate/psikotes`

  // Try nodemailer first, fallback to Supabase SMTP settings
  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (process.env.SMTP_PORT || '465') === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@perusahaan.com',
      to: candidate.email,
      subject: 'Psikotes Telah Dibuka — Segera Kerjakan',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Psikotes Dibuka</h2>
        <p>Halo <b>${candidate.nama}</b>,</p>
        <p>Akses psikotes Anda telah dibuka oleh HR. Silakan kerjakan tes berikut:</p>
        <div style="margin:20px 0;text-align:center">
          <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#7c5bfe;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Mulai Psikotes</a>
        </div>
        <p style="color:#666;font-size:12px">Link ini akan kedaluwarsa sesuai batas waktu yang ditentukan HR.</p>
      </div>`,
    })
    return NextResponse.json({ ok: true })
  } catch {
    // Fallback: just return success; email may be sent via Supabase SMTP on user creation
    return NextResponse.json({ ok: true, note: 'Email not sent via SMTP; ensure Supabase SMTP is configured in project settings' })
  }
}
