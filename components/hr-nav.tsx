'use client'

import type { ReactNode } from 'react'
import {
  IconHome, IconUsers, IconFileCheck, IconMonitor, IconClipboard, IconRocket, IconSettings,
  IconKey, IconBook, IconSliders, IconShield, IconSparkle, IconUpload,
} from './icons'

type Leaf = { tab: string; label: string; icon: ReactNode }
type Branch = { id: string; label: string; icon: ReactNode; children: Leaf[] }
type Group = { group: string; items: (Leaf | Branch)[] }

/**
 * Menu HR mengikuti alur kerja: kandidat masuk → seleksi → karyawan baru.
 * Semua setelan ada di satu grup Pengaturan (semua HR punya akses yang sama).
 * URL tiap halaman tidak berubah.
 */
export const NAV: Group[] = [
  { group: 'Beranda', items: [
    { tab: 'dashboard', label: 'Dashboard', icon: <IconHome size={17} /> },
  ] },
  { group: 'Kandidat', items: [
    { tab: 'candidates', label: 'Daftar Kandidat', icon: <IconUsers size={17} /> },
    { tab: 'upload-cv', label: 'Upload CV', icon: <IconUpload size={17} /> },
  ] },
  { group: 'Seleksi', items: [
    { tab: 'cv', label: 'Penilaian CV', icon: <IconFileCheck size={17} /> },
    { tab: 'akses-tes', label: 'Akses Tes Online', icon: <IconKey size={17} /> },
    { id: 'tes-lokal', label: 'Tes di PC HRD', icon: <IconMonitor size={17} />, children: [
      { tab: 'tes-disc', label: 'Tes DISC', icon: null },
      { tab: 'tes-iq', label: 'Tes IQ', icon: null },
    ] },
    { tab: 'interview', label: 'Interview', icon: <IconClipboard size={17} /> },
  ] },
  { group: 'Karyawan Baru', items: [
    { tab: 'onboarding', label: 'Onboarding', icon: <IconRocket size={17} /> },
  ] },
  { group: 'Pengaturan', items: [
    { tab: 'settings', label: 'Posisi & Kualifikasi', icon: <IconSliders size={17} /> },
    { tab: 'questions', label: 'Bank Soal', icon: <IconBook size={17} /> },
    { tab: 'ai-settings', label: 'Pengaturan AI', icon: <IconSparkle size={17} /> },
    { tab: 'users', label: 'Manajemen User', icon: <IconShield size={17} /> },
    { tab: 'data', label: 'Data & Backup', icon: <IconSettings size={17} /> },
  ] },
]

/** Judul topbar: [judul, subjudul] per tab. */
export const PAGE_TITLES: Record<string, [string, string]> = {
  dashboard: ['Dashboard', 'Yang perlu dikerjakan & ringkasan rekrutmen'],
  candidates: ['Daftar Kandidat', 'Kelola semua pelamar'],
  'upload-cv': ['Upload CV', 'Upload massal · rangkuman & saran kandidat dari AI per posisi'],
  cv: ['Penilaian CV / Resume', 'Skor kelayakan berkas pelamar'],
  'tes-disc': ['Tes DISC', 'Tes di PC HRD · profil kepribadian Most/Least'],
  'tes-iq': ['Tes IQ', 'Tes di PC HRD · logika, numerik, verbal & spasial'],
  'akses-tes': ['Akses Tes Online', 'Kirim akses tes ke perangkat kandidat'],
  interview: ['Penilaian Interview', 'Form kompetensi terstruktur'],
  onboarding: ['Onboarding', 'Checklist karyawan baru'],
  profile: ['Profil Saya', 'Kelola data akun Anda'],
  questions: ['Bank Soal', 'Pengaturan · soal Tes DISC & Tes IQ'],
  settings: ['Posisi & Kualifikasi', 'Pengaturan · kualifikasi yang dipakai AI & bobot kriteria CV per posisi'],
  data: ['Data & Backup', 'Pengaturan · ekspor, impor & hapus data kandidat'],
  users: ['Manajemen User', 'Pengaturan · kelola role & akses pengguna aplikasi'],
  'ai-settings': ['Pengaturan AI', 'Pengaturan · endpoint, model & API key untuk screening CV dan asisten'],
}

export default function HrNav({ active, onNavigate }: { active: string; onNavigate: (tab: string) => void }) {
  return (
    <nav className="nav" aria-label="Menu HR">
      {NAV.map(g => (
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
