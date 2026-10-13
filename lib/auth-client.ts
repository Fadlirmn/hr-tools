import type { SessionUser } from './auth'

/** Client-side: ambil user yang sedang login via /api/auth/me. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json()
  return data.user ?? null
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}
