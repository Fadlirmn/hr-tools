'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getCurrentUser, logout } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import type { Candidate, UserRole } from '@/lib/types'
import ThemeToggle from '@/components/theme-toggle'
import {
  IconHome, IconFileCheck, IconClipboard, IconRocket, IconUser, IconPuzzle, IconBrain, IconMic,
  IconAward, IconArrowLeft,
} from '@/components/icons'

type Leaf = { tab: string; label: string; icon: React.ReactNode }
type Branch = { id: string; label: string; icon: React.ReactNode; children: Leaf[] }
type Group = { group?: string; items: (Leaf | Branch)[] }

// Menu kandidat dikelompokkan (gaya sama dengan sidebar HR). URL tiap halaman tidak berubah.
const NAV: Group[] = [
  { items: [
    { tab: 'candidate/dashboard', label: 'Dashboard', icon: <IconHome size={17} /> },
    { tab: 'candidate/hasil-cv', label: 'CV Saya', icon: <IconFileCheck size={17} /> },
    { id: 'tes', label: 'Tes', icon: <IconClipboard size={17} />, children: [
      { tab: 'candidate/tes-disc', label: 'Tes DISC', icon: <IconPuzzle size={15} /> },
      { tab: 'candidate/tes-iq', label: 'Tes IQ', icon: <IconBrain size={15} /> },
    ] },
    { id: 'hasil', label: 'Hasil', icon: <IconAward size={17} />, children: [
      { tab: 'candidate/hasil-tes-disc', label: 'Hasil Tes DISC', icon: <IconPuzzle size={15} /> },
      { tab: 'candidate/hasil-tes-iq', label: 'Hasil Tes IQ', icon: <IconBrain size={15} /> },
      { tab: 'candidate/hasil-interview', label: 'Hasil Interview', icon: <IconMic size={15} /> },
    ] },
    { tab: 'candidate/onboarding', label: 'Onboarding', icon: <IconRocket size={17} /> },
  ] },
  { group: 'Akun', items: [
    { tab: 'candidate/profile', label: 'Profil Saya', icon: <IconUser size={17} /> },
  ] },
]

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [role, setRole] = useState<UserRole | ''>('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (user) {
        setRole(user.role)
        const c = await getCandidateByUserId(user.id)
        setCandidate(c)
      }
      setLoaded(true)
    })()
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

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
        <nav className="nav" aria-label="Menu kandidat">
          {role === 'dev' && (
            <button type="button" className="dev-back" onClick={() => router.push('/hr/dashboard')}>
              <span className="ico"><IconArrowLeft size={17} /></span> Ke Dashboard HR
            </button>
          )}
          {NAV.map((g, gi) => (
            <div key={g.group || gi} role="group" aria-label={g.group || 'Menu utama'}>
              {g.group && <div className="sep">{g.group}</div>}
              {g.items.map(it => 'children' in it ? (
                // Submenu selalu tampil (tanpa dropdown)
                <div key={it.id} role="group" aria-labelledby={`cnav-${it.id}`}>
                  <div className={`parent-label ${it.children.some(c => c.tab === active) ? 'has-active' : ''}`} id={`cnav-${it.id}`}>
                    <span className="ico">{it.icon}</span> {it.label}
                  </div>
                  <div className="sub">
                    {it.children.map(c => (
                      <button key={c.tab} type="button" className={active === c.tab ? 'active' : ''}
                        aria-current={active === c.tab ? 'page' : undefined} onClick={() => router.push('/' + c.tab)}>
                        <span className="ico">{c.icon}</span>{c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button key={it.tab} type="button" className={active === it.tab ? 'active' : ''}
                  aria-current={active === it.tab ? 'page' : undefined} onClick={() => router.push('/' + it.tab)}>
                  <span className="ico">{it.icon}</span> {it.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600, color: 'var(--side-strong)', fontSize: 12 }}>{candidate?.nama || 'Kandidat'}</div>
            <div style={{ color: 'var(--side-muted)', fontSize: 10.5, marginTop: 1 }}>{candidate?.email || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {role === 'dev' && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 10 }}>DEV</span>}
            <span style={{ flex: 1 }}></span>
            <button type="button" className="side-link" onClick={() => router.push('/candidate/profile')}>Profil</button>
            <span style={{ color: 'var(--side-muted)' }} aria-hidden="true">·</span>
            <button type="button" className="side-link" onClick={handleLogout}>Keluar</button>
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
          <div className="cand-topbar-actions">
            <ThemeToggle />
            <button type="button" className="btn ghost sm" onClick={handleLogout}>Keluar</button>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
