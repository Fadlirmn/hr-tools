'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getCandidateByInviteToken } from '@/lib/db'
import type { Candidate } from '@/lib/types'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const c = await getCandidateByInviteToken(token)
        if (c && !c.user_id) { setCandidate(c); setEmail(c.email || '') }
        else setError('Undangan tidak valid.')
      } catch { setError('Undangan tidak valid.') }
      setChecked(true)
    })()
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidate || password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (!email.trim()) {
      setError('Email harus diisi.')
      return
    }
    setLoading(true)
    setError('')

    const signUpEmail = email.trim()

    // Step 1: Daftarkan user baru di Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: signUpEmail,
      password,
      options: {
        data: { role: 'candidate', candidate_id: candidate.id },
        emailRedirectTo: undefined,
      },
    })

    if (signUpError) {
      // Email sudah terdaftar → coba sign in dulu untuk validasi
      if (signUpError.message.toLowerCase().includes('already registered') ||
          signUpError.message.toLowerCase().includes('already been registered')) {
        setError('Email ini sudah terdaftar. Gunakan email lain atau hubungi HR.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    const userId = signUpData.user?.id
    if (!userId) {
      setError('Gagal membuat akun. Coba lagi.')
      setLoading(false)
      return
    }

    // Deteksi kasus Supabase v2: email sudah ada, tapi signUp tidak throw error
    // (terjadi saat "Prevent duplicate signups" dimatikan di Supabase)
    // Identities kosong = email sudah terdaftar sebelumnya
    const identities = (signUpData.user as any)?.identities
    if (Array.isArray(identities) && identities.length === 0) {
      setError('Email ini sudah terdaftar. Gunakan email lain atau hubungi HR.')
      setLoading(false)
      return
    }

    // Step 2: Hubungkan user ke kandidat via API route (server-side, bypass RLS)
    const res = await fetch('/api/claim-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: candidate.id,
        userId,
        email: signUpEmail,
        inviteToken: token,
      }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || 'Gagal menghubungkan akun. Silakan hubungi HR.')
      setLoading(false)
      return
    }

    setLoading(false)
    setDone(true)
  }

  if (!checked) return null

  if (done) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="logo" style={{ justifyContent: 'center' }}>
            <div className="mark">✓</div>
            <h1>Akun Berhasil Dibuat!</h1>
          </div>
          <p style={{ color: 'var(--ink-soft)', margin: '16px 0 24px' }}>
            Akun dengan email <b>{email}</b> berhasil dibuat.<br />
            Silakan login dengan email dan password tersebut.
          </p>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => router.push('/login')}>Login Sekarang</button>
        </div>
      </div>
    )
  }

  if (error && !candidate) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="sub">{error}</div>
          <button className="btn primary" style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}
            onClick={() => router.push('/login')}>Ke Halaman Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="logo">
          <img src="/logo.png" className="mark" alt="" />
          <div>
            <h1>Recruitment Toolkit</h1>
            <div className="sub" style={{ marginBottom: 0 }}>Undangan Kandidat</div>
          </div>
        </div>
        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--violet-soft)', borderRadius: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{candidate?.nama}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Anda diundang untuk mengikuti proses rekrutmen.</div>
        </div>
        <div className="sub" style={{ marginTop: 18, marginBottom: 6 }}>Lengkapi data akun Anda</div>
        <div className={`error ${error ? 'show' : ''}`}>{error}</div>
        <form onSubmit={handleAccept}>
          <div className="field">
            <label className="fld">Email</label>
            <input type="email" placeholder="email@contoh.com" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label className="fld">Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="Minimal 6 karakter" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password"
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '6px 8px',
                  color: 'var(--muted)', lineHeight: 1,
                }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Memproses...' : 'Buat Akun & Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
