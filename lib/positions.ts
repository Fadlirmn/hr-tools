// Pembuatan posisi baru (dipakai halaman Posisi & Kualifikasi dan form kandidat).
import { v4 as uuidv4 } from 'uuid'
import { CV_CRITERIA } from './constants'
import type { Position, PositionWeight } from './types'

const slug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'posisi'

/** Posisi baru: id unik dari nama, semua bobot 2. */
export function newPosition(name: string, description: string, existing: Position[]): Position {
  let id = `${slug(name)}-${uuidv4().slice(0, 4)}`
  while (existing.some(p => p.id === id)) id = `${slug(name)}-${uuidv4().slice(0, 4)}`
  return {
    id, name: name.trim(), description: description.trim(),
    weights: Object.fromEntries(CV_CRITERIA.map(c => [c.id, 2])) as unknown as PositionWeight,
  }
}

/** Simpan (buat/ubah) posisi. Melempar Error berisi pesan server bila gagal. */
export async function savePosition(p: Position): Promise<void> {
  const res = await fetch('/api/positions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(p),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
}
