// Undangan akun kandidat (client): buat token bila belum ada, lalu salin link /invite/<token>.
import { v4 as uuidv4 } from 'uuid'
import type { Candidate } from './types'

/** Return true bila link berhasil dibuat/disalin (data kandidat perlu dimuat ulang). */
export async function inviteCandidate(c: Pick<Candidate, 'id' | 'user_id' | 'invite_token'>): Promise<boolean> {
  if (c.user_id) return false
  let token = c.invite_token
  if (!token) {
    token = uuidv4()
    const res = await fetch('/api/candidates', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ id: c.id, invite_token: token }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Gagal: ' + (d.error || res.status)); return false }
  }
  // Base URL: pakai domain publik dari env bila ada. window.location.origin
  // ikut localhost saat HR akses via localhost → link tidak bisa dibuka device lain.
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || window.location.origin
  const link = `${base}/invite/${token}`
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    alert(`Link undangan (PERHATIAN: masih localhost, tidak bisa dibuka dari device lain):\n${link}\n\nAgar bisa dibuka kandidat, set NEXT_PUBLIC_APP_URL ke domain publik lalu rebuild/restart.`)
  }
  try {
    await navigator.clipboard.writeText(link)
    alert(c.invite_token ? `Link undangan disalin ulang:\n${link}` : `Link undangan disalin:\n${link}`)
  } catch {
    prompt('Salin link undangan ini secara manual:', link)
  }
  return true
}
