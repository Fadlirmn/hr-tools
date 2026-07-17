'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const isRecovery = hash.includes('type=recovery')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session || isRecovery) {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password minimal 6 karakter.'); return }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
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

  if (!ready) return null

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
