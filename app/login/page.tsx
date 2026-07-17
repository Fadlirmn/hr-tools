'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const m = authError.message.toLowerCase()
      let msg = 'Email atau password salah.'
      if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) {
        msg = 'Email belum diverifikasi. Silakan cek inbox (atau folder spam) dan klik link verifikasi.'
      } else if (m.includes('invalid login credentials')) {
        msg = 'Email atau password salah. Pastikan akun sudah terdaftar di sistem.'
      } else if (m.includes('rate limit') || m.includes('too many')) {
        msg = 'Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.'
      }
      setError(msg)
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role
    if (role === 'hr' || role === 'dev') router.push('/hr/dashboard')
    else if (role === 'candidate') router.push('/candidate/dashboard')
    else router.push('/hr/dashboard')
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="logo">
          <img src="/logo.png" className="mark" alt="" />
          <div>
            <h1>Recruitment Toolkit</h1>
            <div className="sub" style={{ marginBottom: 0 }}>Screening → Onboarding</div>
          </div>
        </div>
        <div className="sub" style={{ marginTop: 16 }}>Masuk ke akun Anda</div>
        <div className={`error ${error ? 'show' : ''}`}>{error}</div>
        <form onSubmit={handleLogin}>
          <div className="field">
            <label className="fld">Email</label>
            <input type="email" placeholder="email@contoh.com" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label className="fld">Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
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
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
            <input type="checkbox" id="remember" checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="remember" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer' }}>
              Ingat saya
            </label>
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <a href="/forgot-password" style={{ color: 'var(--violet)', fontWeight: 600, fontSize: 13 }}>Lupa Password?</a>
          </div>
        </form>
      </div>
    </div>
  )
}
