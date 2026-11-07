// Penyaringan daftar kandidat untuk pencari kandidat (combobox) — fungsi murni.

export type ChipKind = 'ok' | 'hold' | 'no' | 'neutral' | 'violet'

export interface PickerItem {
  id: string
  nama: string
  posisi: string
  /** Masuk filter "perlu dikerjakan" di halaman ini */
  todo: boolean
  /** Sudah selesai di halaman ini (sudah dinilai / sudah tes) */
  done: boolean
  hasCv?: boolean
  score?: string | null
  scoreKind?: ChipKind
}

export type PickerFilter = 'todo' | 'done' | 'all'

export const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Saring berdasarkan filter + teks (setiap kata harus cocok dengan nama atau posisi).
 * Urutan: nama yang diawali teks pencarian lebih dulu, sisanya mengikuti urutan asal.
 */
export function filterCandidates(items: PickerItem[], query: string, filter: PickerFilter): PickerItem[] {
  const q = normalize(query)
  const words = q.split(/\s+/).filter(Boolean)
  const base = items.filter(x => filter === 'all' || (filter === 'todo' ? x.todo : x.done))
  if (!words.length) return base
  const hits = base.filter(x => {
    const hay = normalize(`${x.nama} ${x.posisi}`)
    return words.every(w => hay.includes(w))
  })
  const starts = (x: PickerItem) => normalize(x.nama).startsWith(q) || normalize(x.nama).split(/\s+/).some(p => p.startsWith(words[0]))
  return [...hits.filter(starts), ...hits.filter(x => !starts(x))]
}
