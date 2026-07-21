'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getCandidateByUserId } from '@/lib/db'
import type { Candidate, UserRole } from '@/lib/types'

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [role, setRole] = useState<UserRole | ''>('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setRole((user.user_metadata?.role as UserRole) || '')
        const c = await getCandidateByUserId(user.id)
        setCandidate(c)
      }
      setLoaded(true)
    })()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const nav = [
    { tab: 'candidate/dashboard', label: 'Dashboard' },
    { tab: 'candidate/hasil-cv', label: 'Hasil CV' },
    { tab: 'candidate/psikotes', label: 'Psikotes' },
    { tab: 'candidate/hasil-psikotes', label: 'Hasil Psikotes' },
    { tab: 'candidate/hasil-interview', label: 'Hasil Interview' },
    { tab: 'candidate/onboarding', label: 'Onboarding' },
    { sep: 'Akun' },
    { tab: 'candidate/profile', label: 'Profil Saya' },
  ]

  // Gunakan pathname langsung untuk match yang akurat (tanpa leading slash)
  const active = pathname.startsWith('/') ? pathname.slice(1) : pathname

  if (!loaded) return null

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <img src="/logo.png" className="mark" alt="" />
            <div><h1>Recruitment Toolkit</h1><p>{role === 'dev' ? 'Developer Mode' : 'Portal Kandidat'}</p></div>
          </div>
        </div>
        <nav className="nav">
          {role === 'dev' && (
            <button onClick={() => router.push('/hr/dashboard')}
              style={{ background: 'rgba(255,255,255,.08)', color: '#fff', marginBottom: 6 }}>
              <span className="ico">←</span> Ke Dashboard HR
            </button>
          )}
          {nav.map((item, i) =>
            'sep' in item ? (
              <div className="sep" key={i}>{item.sep}</div>
            ) : (
              <button key={item.tab} className={active === item.tab ? 'active' : ''}
                onClick={() => router.push('/' + item.tab)}>
                <span className="ico">{'▦'}</span> {item.label}
              </button>
            )
          )}
        </nav>
        <div className="side-foot">
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600, color: '#fff', fontSize: 12 }}>{candidate?.nama || 'Kandidat'}</div>
            <div style={{ color: '#9c98bf', fontSize: 10.5, marginTop: 1 }}>{candidate?.email || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {role === 'dev' && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 10 }}>DEV</span>}
            <span style={{ flex: 1 }}></span>
            <span style={{ cursor: 'pointer' }} onClick={() => router.push('/candidate/profile')}>Profil</span>
            <span style={{ color: '#9c98bf' }}>·</span>
            <span style={{ cursor: 'pointer' }} onClick={handleLogout}>Keluar</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h2>{candidate?.nama || 'Kandidat'}</h2>
              <div className="sub">Portal kandidat — lihat hasil seleksi Anda</div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={handleLogout}>Keluar</button>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
