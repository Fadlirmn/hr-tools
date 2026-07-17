'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const role = session?.user.user_metadata?.role
    if (role === 'hr') router.push('/hr/dashboard')
    else if (role === 'candidate') router.push('/candidate/dashboard')
    else router.push('/')
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="logo">
          <div className="mark">HR</div>
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
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="fld">Password</label>
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
