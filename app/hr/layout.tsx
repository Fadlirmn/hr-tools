'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import { getCurrentUser, logout } from '@/lib/auth-client'
import type { UserRole } from '@/lib/types'

const NAV_ITEMS = [
  { sep: 'Pipeline' },
  { tab: 'dashboard', ico: '▦', label: 'Dashboard' },
  { tab: 'candidates', ico: '☰', label: 'Daftar Kandidat' },
  { sep: 'Tahap Seleksi' },
  { tab: 'cv', ico: '▤', label: 'Penilaian CV' },
  { tab: 'tes-disc', ico: '◈', label: 'Tes DISC' },
  { tab: 'tes-iq', ico: '⬢', label: 'Tes IQ' },
  { tab: 'akses-tes', ico: '◉', label: 'Akses Tes' },
  { tab: 'interview', ico: '◔', label: 'Interview' },
  { tab: 'onboarding', ico: '✦', label: 'Onboarding' },
  { sep: 'Pengaturan' },
  { tab: 'profile', ico: '◎', label: 'Profil Saya' },
  { tab: 'questions', ico: '?', label: 'Bank Soal Tes' },
  { tab: 'settings', ico: '◇', label: 'Posisi & Bobot' },
]

const DEV_NAV_ITEMS = [
  { sep: 'Developer' },
  { tab: 'users', ico: '⊕', label: 'Manajemen User' },
]

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState<UserRole | ''>('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (user) {
        setRole(user.role)
        setUserEmail(user.email)
        setUserName(user.nama || '')
      }
    })()
  }, [])

  const activeTab = pathname.replace('/hr/', '') || 'dashboard'

  const navigate = useCallback((tab: string) => {
    router.push(`/hr/${tab}`)
    setSidebarOpen(false)
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const pageTitle = (() => {
    const map: Record<string, [string, string]> = {
      'dashboard': ['Dashboard', 'Ringkasan proses rekrutmen'],
      'candidates': ['Daftar Kandidat', 'Kelola semua pelamar'],
      'cv': ['Penilaian CV / Resume', 'Skor kelayakan berkas pelamar'],
      'tes-disc': ['Tes DISC', 'Profil kepribadian 4-dimensi (Most/Least)'],
      'tes-iq': ['Tes IQ', 'Logika, numerik, verbal & spasial per bagian'],
      'akses-tes': ['Akses Tes', 'Kelola akses Tes DISC & Tes IQ kandidat'],
      'interview': ['Penilaian Interview', 'Form kompetensi terstruktur'],
      'onboarding': ['Onboarding', 'Checklist karyawan baru'],
      'profile': ['Profil Saya', 'Kelola data akun Anda'],
      'questions': ['Bank Soal Tes', 'Kelola soal Tes DISC & Tes IQ'],
      'settings': ['Posisi & Bobot Penilaian', 'Atur posisi dan bobot kriteria CV'],
      'users': ['Manajemen User', 'Kelola role & akses pengguna aplikasi'],
    }
    return map[activeTab] || ['Dashboard', '']
  })()

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="logo">
            <img src="/logo.png" className="mark" alt="" />
            <div><h1>Recruitment Toolkit</h1><p>Screening → Onboarding</p></div>
          </div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item, i) =>
            'sep' in item ? (
              <div className="sep" key={i}>{item.sep}</div>
            ) : (
              <button key={item.tab}
                className={activeTab === item.tab ? 'active' : ''}
                onClick={() => navigate(item.tab!)}>
                <span className="ico">{item.ico}</span> {item.label}
              </button>
            )
          )}
          {role === 'dev' && DEV_NAV_ITEMS.map((item, i) =>
            'sep' in item ? (
              <div className="sep" key={`dev-${i}`}>{item.sep}</div>
            ) : (
              <button key={item.tab}
                className={activeTab === item.tab ? 'active' : ''}
                onClick={() => navigate(item.tab!)}>
                <span className="ico">{item.ico}</span> {item.label}
              </button>
            )
          )}
        </nav>
        <div className="side-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Avatar circle */}
            <div
              onClick={() => navigate('profile')}
              title="Pengaturan Profil"
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 15,
                cursor: 'pointer', userSelect: 'none',
                transition: 'opacity .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {(userName || userEmail).charAt(0).toUpperCase()}
            </div>

            {/* Name + email */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontWeight: 600, color: '#fff', fontSize: 12,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {userName || userEmail}
              </div>
              <div style={{
                color: '#9c98bf', fontSize: 10, marginTop: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {role === 'dev' && <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 4 }}>DEV</span>}
                {role === 'hr' && <span style={{ color: '#22c55e', fontWeight: 700, marginRight: 4 }}>HR</span>}
                {userEmail}
              </div>
            </div>

            {/* Profile settings icon */}
            <button
              onClick={() => navigate('profile')}
              title="Pengaturan Profil"
              style={{
                background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8,
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#9c98bf', fontSize: 15, flexShrink: 0,
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.18)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#9c98bf' }}
            >
              ⚙
            </button>

            {/* Logout icon */}
            <button
              onClick={handleLogout}
              title="Keluar"
              style={{
                background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8,
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#9c98bf', fontSize: 14, flexShrink: 0,
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.2)'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#9c98bf' }}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>


      <main className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn sm menutoggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div>
              <h2>{pageTitle[0]}</h2>
              <div className="sub">{pageTitle[1]}</div>
            </div>
          </div>
          <button className="btn primary" onClick={() => navigate('candidates')}>＋ Kandidat Baru</button>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
