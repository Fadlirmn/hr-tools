'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password minimal 6 karakter.'); return }
    if (!token) { setError('Link reset password tidak valid.'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Gagal mereset password.'); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="logo" style={{ justifyContent: 'center' }}>
            <div className="mark">✓</div>
            <h1>Password Berhasil Diubah</h1>
          </div>
          <p style={{ color: 'var(--ink-soft)', margin: '16px 0 24px' }}>Silakan login dengan password baru Anda.</p>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => router.push('/login')}>Login Sekarang</button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="sub">Link reset password tidak valid atau sudah kedaluwarsa.</div>
          <button className="btn primary" style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}
            onClick={() => router.push('/forgot-password')}>Minta Link Baru</button>
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
            <div className="sub" style={{ marginBottom: 0 }}>Buat Password Baru</div>
          </div>
        </div>
        <div className="sub" style={{ marginTop: 16 }}>Masukkan password baru untuk akun Anda.</div>
        <div className={`error ${error ? 'show' : ''}`}>{error}</div>
        <form onSubmit={handleReset}>
          <div className="field">
            <label className="fld">Password baru</label>
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
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
        <div className="sub" style={{ marginTop: 18, textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>← Kembali ke Login</a>
        </div>
      </div>
    </div>
  )
}
