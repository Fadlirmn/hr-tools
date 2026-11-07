'use client'

import type { ReactNode } from 'react'
import {
  IconHome, IconUsers, IconFileCheck, IconMonitor, IconClipboard, IconRocket, IconSettings,
  IconKey, IconBook, IconSliders, IconShield,
} from './icons'

type Leaf = { tab: string; label: string; icon: ReactNode }
type Branch = { id: string; label: string; icon: ReactNode; children: Leaf[] }
type Group = { group: string; items: (Leaf | Branch)[]; devOnly?: boolean }

/**
 * Menu HR dikelompokkan berdasarkan perilaku:
 * - Tes di PC HRD: kandidat mengerjakan tes di komputer HR (atau HR menginput jawaban).
 * - Akses Tes Online: kandidat mengerjakan tes di perangkatnya sendiri (menu tersendiri).
 * - Pengaturan Tes: bank soal, posisi & bobot.
 * URL tiap halaman tidak berubah.
 */
export const NAV: Group[] = [
  { group: 'Beranda', items: [
    { tab: 'dashboard', label: 'Dashboard', icon: <IconHome size={17} /> },
    { tab: 'candidates', label: 'Daftar Kandidat', icon: <IconUsers size={17} /> },
  ] },
  { group: 'Seleksi', items: [
    { tab: 'cv', label: 'Penilaian CV', icon: <IconFileCheck size={17} /> },
    { tab: 'akses-tes', label: 'Akses Tes Online', icon: <IconKey size={17} /> },
    { id: 'tes-lokal', label: 'Tes di PC HRD', icon: <IconMonitor size={17} />, children: [
      { tab: 'tes-disc', label: 'Tes DISC', icon: null },
      { tab: 'tes-iq', label: 'Tes IQ', icon: null },
    ] },
    { tab: 'interview', label: 'Interview', icon: <IconClipboard size={17} /> },
    { tab: 'onboarding', label: 'Onboarding', icon: <IconRocket size={17} /> },
  ] },
  { group: 'Pengaturan', items: [
    { id: 'pengaturan-tes', label: 'Pengaturan Tes', icon: <IconSettings size={17} />, children: [
      { tab: 'questions', label: 'Bank Soal', icon: <IconBook size={15} /> },
      { tab: 'settings', label: 'Posisi & Bobot', icon: <IconSliders size={15} /> },
    ] },
  ] },
  { group: 'Developer', devOnly: true, items: [
    { tab: 'users', label: 'Manajemen User', icon: <IconShield size={17} /> },
  ] },
]

/** Judul topbar: [judul, subjudul] per tab. */
export const PAGE_TITLES: Record<string, [string, string]> = {
  dashboard: ['Dashboard', 'Yang perlu dikerjakan & ringkasan rekrutmen'],
  candidates: ['Daftar Kandidat', 'Kelola semua pelamar'],
  cv: ['Penilaian CV / Resume', 'Skor kelayakan berkas pelamar'],
  'tes-disc': ['Tes DISC', 'Tes di PC HRD · profil kepribadian Most/Least'],
  'tes-iq': ['Tes IQ', 'Tes di PC HRD · logika, numerik, verbal & spasial'],
  'akses-tes': ['Akses Tes Online', 'Kirim akses tes ke perangkat kandidat'],
  interview: ['Penilaian Interview', 'Form kompetensi terstruktur'],
  onboarding: ['Onboarding', 'Checklist karyawan baru'],
  profile: ['Profil Saya', 'Kelola data akun Anda'],
  questions: ['Bank Soal', 'Pengaturan Tes · soal Tes DISC & Tes IQ'],
  settings: ['Posisi & Bobot', 'Pengaturan Tes · posisi, kualifikasi & bobot kriteria CV'],
  users: ['Manajemen User', 'Kelola role & akses pengguna aplikasi'],
}

export default function HrNav({ active, isDev, onNavigate }: { active: string; isDev: boolean; onNavigate: (tab: string) => void }) {
  return (
    <nav className="nav" aria-label="Menu HR">
      {NAV.filter(g => !g.devOnly || isDev).map(g => (
        <div key={g.group} role="group" aria-label={g.group}>
          <div className="sep">{g.group}</div>
          {g.items.map(it => 'children' in it ? (
            // Submenu selalu tampil (tanpa dropdown)
            <div key={it.id} role="group" aria-labelledby={`nav-${it.id}`}>
              <div className={`parent-label ${it.children.some(c => c.tab === active) ? 'has-active' : ''}`} id={`nav-${it.id}`}>
                <span className="ico">{it.icon}</span> {it.label}
              </div>
              <div className="sub">
                {it.children.map(c => (
                  <button key={c.tab} type="button" className={active === c.tab ? 'active' : ''}
                    aria-current={active === c.tab ? 'page' : undefined} onClick={() => onNavigate(c.tab)}>
                    {c.icon && <span className="ico">{c.icon}</span>}{c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button key={it.tab} type="button" className={active === it.tab ? 'active' : ''}
              aria-current={active === it.tab ? 'page' : undefined} onClick={() => onNavigate(it.tab)}>
              <span className="ico">{it.icon}</span> {it.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}
