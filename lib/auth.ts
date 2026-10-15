import { cookies } from 'next/headers'
import crypto from 'crypto'
import { query } from './pg'
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_DURATION } from './session-token'
import type { UserRole } from './types'

export interface SessionUser {
  id: string
  email: string
  role: UserRole
  nama: string
  username: string
  telepon: string
}

// --- Password hashing (PBKDF2, sama pola dengan Kurma Mail) ---
// Node-only (modul `crypto`) — aman karena fungsi ini hanya dipanggil dari
// Route Handlers (Node runtime), tidak pernah dari middleware (Edge runtime).
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':')
    if (!salt || !hash) return false
    const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'))
  } catch {
    return false
  }
}

const COOKIE_SECURE = process.env.NODE_ENV === 'production'

export async function setSession(userId: string, role: UserRole) {
  const token = await createSessionToken(userId, role)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  // Flag harus cocok dengan setSession — kalau tidak, browser menolak
  // menimpa/menghapus cookie Secure di HTTPS dan logout gagal diam-diam.
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

async function getUserById(userId: string): Promise<SessionUser | null> {
  const res = await query<SessionUser>(
    `SELECT id, email, role, nama, username, telepon FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  )
  return res.rows[0] || null
}

/**
 * Dipakai di Server Components / Route Handlers (Node runtime, akses DB tersedia).
 * Selalu query DB agar data terbaru (nama, telepon, dst) — role di token dipakai
 * middleware saja untuk fast-path, bukan sumber kebenaran final di sini.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const claims = await verifySessionToken(token)
  if (!claims) return null
  return getUserById(claims.userId)
}

export { SESSION_COOKIE_NAME }
