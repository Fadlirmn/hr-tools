'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (err) setError(err.message)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="logo" style={{ justifyContent: 'center' }}>
            <div className="mark">✓</div>
            <h1>Cek Email Anda</h1>
          </div>
          <p style={{ color: 'var(--ink-soft)', margin: '16px 0 8px', lineHeight: 1.6 }}>
            Link reset password sudah dikirim ke <b>{email}</b>.<br />
            Cek inbox atau folder spam.
          </p>
          <div className="sub" style={{ marginTop: 20, marginBottom: 24 }}>
            <a href="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>Kembali ke Login</a>
          </div>
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
            <div className="sub" style={{ marginBottom: 0 }}>Reset Password</div>
          </div>
        </div>
        <div className="sub" style={{ marginTop: 16 }}>Masukkan email untuk menerima link reset password.</div>
        <div className={`error ${error ? 'show' : ''}`}>{error}</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="fld">Email</label>
            <input type="email" placeholder="email@contoh.com" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
          </button>
        </form>
        <div className="sub" style={{ marginTop: 18, textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>← Kembali ke Login</a>
        </div>
      </div>
    </div>
  )
}
