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
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const c = await getCandidateByInviteToken(token)
        if (c && !c.user_id) setCandidate(c)
        else setError('Undangan tidak valid atau sudah digunakan.')
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
    setLoading(true)
    setError('')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: candidate.email || `${candidate.nama.toLowerCase().replace(/\s/g, '')}@kandidat.hr`,
      password,
      options: {
        data: { role: 'candidate', candidate_id: candidate.id },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('candidates')
      .update({ user_id: signUpData.user!.id, invite_token: null })
      .eq('id', candidate.id)

    if (updateError) {
      setError('Gagal menghubungkan akun. Silakan hubungi HR.')
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
            Silakan login dengan email dan password yang sudah dibuat.
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
          <div className="mark">HR</div>
          <div>
            <h1>Recruitment Toolkit</h1>
            <div className="sub" style={{ marginBottom: 0 }}>Undangan Kandidat</div>
          </div>
        </div>
        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--violet-soft)', borderRadius: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{candidate?.nama}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Anda diundang untuk mengikuti proses rekrutmen.</div>
        </div>
        <div className="sub" style={{ marginTop: 18, marginBottom: 6 }}>Buat password untuk akun Anda</div>
        <div className={`error ${error ? 'show' : ''}`}>{error}</div>
        <form onSubmit={handleAccept}>
          <div className="field">
            <label className="fld">Password</label>
            <input type="password" placeholder="Minimal 6 karakter" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Memproses...' : 'Buat Akun & Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
