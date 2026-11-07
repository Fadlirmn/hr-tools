'use client'

import { useSyncExternalStore } from 'react'
import { IconMoon, IconSun } from './icons'

export const THEME_KEY = 'kurma-hr-theme'

// Dijalankan di <head> sebelum React agar tidak berkedip: pakai pilihan tersimpan, kalau
// tidak ada biarkan CSS mengikuti prefers-color-scheme.
export const THEME_INIT_SCRIPT =
  `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`

type Theme = 'light' | 'dark'

function current(): Theme {
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'light' || t === 'dark') return t
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  mq?.addEventListener('change', cb)
  return () => { mo.disconnect(); mq?.removeEventListener('change', cb) }
}

function setTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(THEME_KEY, t) } catch { /* mode privat: cukup untuk sesi ini */ }
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => 'light' as Theme)
  return (
    <div className="theme-toggle" role="group" aria-label="Tema tampilan">
      <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><IconSun size={14} />Putih</button>
      <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><IconMoon size={14} />Gelap</button>
    </div>
  )
}
