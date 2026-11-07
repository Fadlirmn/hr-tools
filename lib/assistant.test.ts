import { describe, it, expect } from 'vitest'
import { buildReport, type Snap } from './assistant'

const s = (o: Partial<Snap>): Snap => ({ id: 'x', nama: 'X', posisi: 'Marketing', sumber: 'Glints', masuk: '', tahap: 'Screening CV', cv_terupload: true,
  status_ai: 'selesai', skor_ai: null, verdict_ai: null, skor_hr: null, verdict_hr: null, keputusan: null, alasan_tidak_lanjut: null, perlu_digali: [], ...o })
const ALL = [
  s({ id: 'b', nama: 'Budi Santoso', skor_ai: 79, verdict_ai: 'Lolos', sumber: 'KitaLulus' }),
  s({ id: 'd', nama: 'Dewi Anggraini', skor_ai: 70, verdict_ai: 'Pertimbangkan', skor_hr: 81, verdict_hr: 'Lolos' }),
  s({ id: 'r', nama: 'Rizky Maulana', posisi: 'Iklan', skor_hr: 42, verdict_hr: 'Tidak Lolos', alasan_tidak_lanjut: 'Pengalaman kurang relevan' }),
  s({ id: 'k', nama: 'Raka Pratama', cv_terupload: false, status_ai: 'tidak ada CV' }),
]

describe('buildReport', () => {
  it('menghitung KPI; skor HR mengalahkan skor AI', () => {
    const r = buildReport(ALL)
    expect(r).toMatchObject({ total: 4, cv_masuk: 3, dianalisis_ai: 2 })
    expect(r.perlu_dinilai.map(x => x.id)).toEqual(['b'])
    expect(r.verdict).toMatchObject({ Lolos: 2, 'Tidak Lolos': 1 })
    expect(r.peringkat[0]).toMatchObject({ id: 'd', skor: 81, sumber_skor: 'HR' })
    expect(r.alasan_tidak_lanjut).toEqual({ 'Pengalaman kurang relevan': 1 })
  })
  it('filter posisi', () => expect(buildReport(ALL, 'iklan').total).toBe(1))
})

import { describe as dM, it as iM, expect as eM } from 'vitest'
import { findMentions } from './assistant'

dM('findMentions', () => {
  const all = [
    { id: 'b', nama: 'Budi Santoso', posisi: 'Marketing' },
    { id: 's', nama: 'Sari Wulandari', posisi: 'Copywriter' },
    { id: 's2', nama: 'Sari Dewi', posisi: 'Iklan' },
    { id: 'r', nama: 'Raka Pratama', posisi: 'Creator' },
  ]
  iM('nama lengkap & nama depan unik, urut kemunculan', () => {
    eM(findMentions('Prioritaskan **Raka**, lalu Budi Santoso.', all).map(m => m.id)).toEqual(['r', 'b'])
  })
  iM('nama depan yang tidak unik tidak ditebak', () => {
    eM(findMentions('Sari belum dinilai', all)).toEqual([])
    eM(findMentions('Sari Wulandari belum dinilai', all).map(m => m.id)).toEqual(['s'])
  })
  iM('tidak cocok sebagian kata, dan kandidat dari aksi ikut', () => {
    eM(findMentions('Budiman bukan kandidat', all)).toEqual([])
    eM(findMentions('CV dibuka.', all, ['r']).map(m => m.id)).toEqual(['r'])
  })
})
