'use client'

import { useState, useRef } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const startCooldown = (sec: number) => {
    setCooldown(sec)
    timer.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timer.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)

    if (!res.ok) {
      if (res.status === 429) {
        setError('Terlalu banyak permintaan. Tunggu 2 menit sebelum mencoba lagi.')
        startCooldown(120)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal mengirim link reset.')
        startCooldown(30)
      }
    } else {
      setDone(true)
    }
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
          <img src="/logo.png" className="mark" alt="" />
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
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading || cooldown > 0}>
            {loading ? 'Mengirim...' : cooldown > 0 ? `Tunggu ${cooldown} detik` : 'Kirim Link Reset'}
          </button>
        </form>
        <div className="sub" style={{ marginTop: 18, textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>← Kembali ke Login</a>
        </div>
      </div>
    </div>
  )
}
