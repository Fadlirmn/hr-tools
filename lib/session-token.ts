/**
 * Edge-runtime-safe session token sign/verify. Dipakai oleh middleware.ts
 * (Edge Runtime) DAN lib/auth.ts (Node runtime) — satu sumber logic token,
 * tanpa dependency ke `next/headers` atau Postgres.
 *
 * Pakai Web Crypto API (globalThis.crypto.subtle), bukan modul Node `crypto`,
 * karena modul Node `crypto` tidak didukung di Edge Runtime Next.js.
 */
import type { UserRole } from './types'

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key-at-least-32-chars-long'
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 hari

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return toHex(sig)
}

export interface TokenClaims {
  userId: string
  role: UserRole
}

export async function createSessionToken(userId: string, role: UserRole): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION
  const payload = `${userId}.${role}.${expiresAt}`
  const signature = await hmacSign(payload)
  return `${payload}.${signature}`
}

export async function verifySessionToken(token: string | undefined): Promise<TokenClaims | null> {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 4) return null
    const [userId, role, expiresAtStr, signature] = parts
    const expiresAt = parseInt(expiresAtStr, 10)
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null
    const payload = `${userId}.${role}.${expiresAt}`
    const expected = await hmacSign(payload)
    if (timingSafeEqualHex(signature, expected)) {
      return { userId, role: role as UserRole }
    }
  } catch {
    return null
  }
  return null
}

export const SESSION_COOKIE_NAME = 'hr_session'
