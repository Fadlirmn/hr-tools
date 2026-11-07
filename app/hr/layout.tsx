'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect, useRef, Suspense } from 'react'
import { getCurrentUser, logout } from '@/lib/auth-client'
import type { UserRole } from '@/lib/types'
import ThemeToggle from '@/components/theme-toggle'
import Assistant from '@/components/assistant'
import HrNav, { PAGE_TITLES } from '@/components/hr-nav'

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

  // Tinggi topbar (sticky) → --topbar-h, dipakai elemen sticky di bawahnya (ringkasan skor CV)
  const topbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = topbarRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeTab = pathname.replace('/hr/', '') || 'dashboard'

  const navigate = useCallback((tab: string) => {
    router.push(`/hr/${tab}`)
    setSidebarOpen(false)
  }, [router])

  // Tombol atas "＋ Kandidat Baru": langsung buka modal tambah kandidat.
  // - Kalau sudah di halaman kandidat → kirim event agar modal langsung terbuka.
  // - Kalau dari halaman lain → titip flag via sessionStorage, lalu pindah halaman;
  //   halaman kandidat baca flag itu setelah load dan otomatis buka modal.
  const handleAddCandidate = useCallback(() => {
    setSidebarOpen(false)
    if (activeTab === 'candidates') {
      window.dispatchEvent(new CustomEvent('open-add-candidate'))
    } else {
      try { sessionStorage.setItem('open-add-candidate', '1') } catch { /* abaikan */ }
      router.push('/hr/candidates')
    }
  }, [router, activeTab])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const pageTitle = PAGE_TITLES[activeTab.split('/')[0]] || PAGE_TITLES.dashboard

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="logo">
            <img src="/logo.png" className="mark" alt="" />
            <div><h1>Recruitment Toolkit</h1><p>Screening → Onboarding</p></div>
          </div>
        </div>
        <HrNav active={activeTab.split('/')[0]} isAdmin={role === 'hr' || role === 'dev'} onNavigate={navigate} />
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
                fontWeight: 600, color: 'var(--side-strong)', fontSize: 12,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {userName || userEmail}
              </div>
              <div style={{
                color: 'var(--side-muted)', fontSize: 10, marginTop: 1,
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
                background: 'var(--side-hover)', border: 'none', borderRadius: 8,
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--side-muted)', fontSize: 15, flexShrink: 0,
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--btn-hover)'; e.currentTarget.style.color = 'var(--side-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--side-hover)'; e.currentTarget.style.color = 'var(--side-muted)' }}
            >
              ⚙
            </button>

            {/* Logout icon */}
            <button
              onClick={handleLogout}
              title="Keluar"
              style={{
                background: 'var(--side-hover)', border: 'none', borderRadius: 8,
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--side-muted)', fontSize: 14, flexShrink: 0,
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.2)'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--side-hover)'; e.currentTarget.style.color = 'var(--side-muted)' }}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>


      <main className="main">
        <div className="topbar" ref={topbarRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn sm menutoggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div>
              <h2>{pageTitle[0]}</h2>
              <div className="sub">{pageTitle[1]}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="btn primary" onClick={handleAddCandidate}>＋ Kandidat Baru</button>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
      <Suspense fallback={null}><Assistant /></Suspense>
    </div>
  )
}
