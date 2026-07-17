'use client'

import { useRouter, usePathname, useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase'

const NAV_ITEMS = [
  { sep: 'Pipeline' },
  { tab: 'dashboard', ico: '▦', label: 'Dashboard' },
  { tab: 'candidates', ico: '☰', label: 'Daftar Kandidat' },
  { sep: 'Tahap Seleksi' },
  { tab: 'cv', ico: '▤', label: 'Penilaian CV' },
  { tab: 'psikotes', ico: '◉', label: 'Psikotes' },
  { tab: 'interview', ico: '◔', label: 'Interview' },
  { tab: 'onboarding', ico: '✦', label: 'Onboarding' },
  { sep: 'Pengaturan' },
  { tab: 'settings', ico: '◇', label: 'Posisi & Bobot' },
]

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeTab = pathname.replace('/hr/', '') || 'dashboard'

  const navigate = useCallback((tab: string) => {
    router.push(`/hr/${tab}`)
    setSidebarOpen(false)
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const pageTitle = (() => {
    const map: Record<string, [string, string]> = {
      'dashboard': ['Dashboard', 'Ringkasan proses rekrutmen'],
      'candidates': ['Daftar Kandidat', 'Kelola semua pelamar'],
      'cv': ['Penilaian CV / Resume', 'Skor kelayakan berkas pelamar'],
      'psikotes': ['Psikotes', 'Tes kognitif, kepribadian & integritas'],
      'interview': ['Penilaian Interview', 'Form kompetensi terstruktur'],
      'onboarding': ['Onboarding', 'Checklist karyawan baru'],
      'settings': ['Posisi & Bobot Penilaian', 'Atur posisi dan bobot kriteria CV'],
    }
    return map[activeTab] || ['Dashboard', '']
  })()

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="logo">
            <div className="mark">HR</div>
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
        </nav>
        <div className="side-foot" style={{ cursor: 'pointer' }} onClick={handleLogout}>
          Keluar
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
