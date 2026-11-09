'use client'

import { useEffect, useState } from 'react'
import { getPositions } from '@/lib/db'
import { fetchCandidates } from '@/lib/db-hr'
import type { Candidate, Position, PositionWeight } from '@/lib/types'
import { CV_CRITERIA, POSITIONS_DEFAULT } from '@/lib/constants'
import { newPosition, savePosition } from '@/lib/positions'
import { IconInfo } from '@/components/icons'

// Posisi & Kualifikasi: kualifikasi dipakai AI saat membaca CV, bobot dipakai skor CV.
export default function HrPositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = async () => {
    const [pos, cands] = await Promise.all([getPositions(), fetchCandidates() as Promise<Candidate[]>])
    // Terbaru di atas; posisi lama (tanggal sama) urut abjad
    setPositions([...pos].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || a.name.localeCompare(b.name)))
    const m: Record<string, number> = {}
    for (const c of cands) if (c.posisi) m[c.posisi] = (m[c.posisi] || 0) + 1
    setCounts(m)
  }

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  /** Simpan posisi; tampilkan hasil singkat. */
  const persist = async (p: Position, okText: string) => {
    try {
      await savePosition(p)
      setPositions(prev => prev.map(x => x.id === p.id ? p : x))
      setMsg({ ok: true, text: okText })
      return true
    } catch (e) {
      setMsg({ ok: false, text: 'Gagal menyimpan: ' + (e as Error).message })
      return false
    }
  }

  const setWeight = (p: Position, cid: string, n: number) =>
    persist({ ...p, weights: { ...p.weights, [cid]: n } as PositionWeight }, `Bobot ${p.name} tersimpan.`)

  const rename = (p: Position, name: string) => {
    const v = name.trim()
    if (!v || v === p.name) return
    void persist({ ...p, name: v }, `Nama posisi diubah jadi ${v}.`)
  }

  const setDescription = (p: Position, description: string) => {
    if ((p.description || '') === description) return
    void persist({ ...p, description }, `Kualifikasi ${p.name} tersimpan.`)
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) { setMsg({ ok: false, text: 'Isi nama posisi dulu.' }); return }
    if (!newDesc.trim()) { setMsg({ ok: false, text: 'Isi kualifikasi posisi dulu, AI memakainya untuk menilai CV.' }); return }
    if (positions.some(p => p.name.toLowerCase() === name.toLowerCase())) { setMsg({ ok: false, text: 'Nama posisi sudah ada.' }); return }
    const p = newPosition(name, newDesc, positions)
    try {
      await savePosition(p)
      setPositions(prev => [{ ...p, created_at: new Date().toISOString() }, ...prev])
      setNewName('')
      setNewDesc('')
      setMsg({ ok: true, text: `Posisi ${p.name} ditambahkan.` })
    } catch (e) {
      setMsg({ ok: false, text: 'Gagal menambah posisi: ' + (e as Error).message })
    }
  }

  const remove = async (p: Position) => {
    if (positions.length <= 1) { setMsg({ ok: false, text: 'Minimal harus ada 1 posisi.' }); return }
    const n = counts[p.id] || 0
    if (!confirm(`Hapus posisi "${p.name}"?${n ? `\n${n} kandidat di posisi ini akan menjadi tanpa posisi.` : ''}`)) return
    const res = await fetch('/api/positions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: p.id }),
    })
    if (!res.ok) { setMsg({ ok: false, text: 'Gagal menghapus posisi.' }); return }
    setPositions(prev => prev.filter(x => x.id !== p.id))
    setMsg({ ok: true, text: `Posisi ${p.name} dihapus.` })
  }

  const resetPos = async () => {
    if (!confirm('Kembalikan nama & bobot 6 posisi bawaan? Kualifikasi yang sudah diisi dan posisi buatan sendiri tetap ada.')) return
    try {
      for (const oldId of ['videoeditor', 'sosmed', 'designer', 'admin']) {
        await fetch('/api/positions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: oldId }) })
      }
      for (const p of JSON.parse(JSON.stringify(POSITIONS_DEFAULT)) as Position[]) await savePosition(p)
      await load()
      setMsg({ ok: true, text: 'Posisi bawaan dikembalikan.' })
    } catch (e) {
      setMsg({ ok: false, text: 'Gagal: ' + (e as Error).message })
    }
  }

  return (
    <>
      <div className="notice" style={{ marginBottom: 14 }}>
        <IconInfo size={16} style={{ marginTop: 1, color: 'var(--violet)' }} />
        <div><b>Kualifikasi</b> dibaca AI saat menilai CV pelamar posisi itu. <b>Bobot</b> (1–3) menentukan seberapa besar tiap kriteria memengaruhi skor CV. Perubahan tersimpan otomatis.</div>
      </div>
      {msg && <div className="hint" role="status" style={{ margin: '0 0 12px', color: msg.ok ? 'var(--ok)' : 'var(--no)' }}>{msg.text}</div>}

      <div className="card card-p" style={{ marginBottom: 16 }}>
        <h4 className="blk" style={{ marginTop: 0 }}>Tambah posisi</h4>
        <div className="field"><label className="fld" htmlFor="new-pos">Nama posisi *</label>
          <input id="new-pos" type="text" value={newName} onChange={e => setNewName(e.target.value)} style={{ maxWidth: 340 }} /></div>
        <div className="field"><label className="fld" htmlFor="new-desc">Kualifikasi *</label>
          <textarea id="new-desc" value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Pengalaman, skill, pendidikan, dan syarat lain yang dicari untuk posisi ini." /></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={add}>＋ Tambah posisi</button>
          <button className="btn" onClick={resetPos}>Kembalikan posisi bawaan</button>
        </div>
      </div>

      {positions.map(p => (
        <div className="card card-p" style={{ marginBottom: 14 }} key={p.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input type="text" defaultValue={p.name} aria-label="Nama posisi" onBlur={e => rename(p, e.target.value)}
              style={{ maxWidth: 340, fontWeight: 700 }} />
            <span className="hint" style={{ marginLeft: 'auto' }}>{counts[p.id] || 0} kandidat</span>
            <button className="btn sm danger" onClick={() => remove(p)}>Hapus posisi</button>
          </div>
          <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
            <label className="fld" htmlFor={`desc-${p.id}`}>Kualifikasi <span className="hint">(dibaca AI saat menilai CV)</span></label>
            <textarea id={`desc-${p.id}`} defaultValue={p.description || ''} onBlur={e => setDescription(p, e.target.value.trim())}
              placeholder="Pengalaman, skill, pendidikan, dan syarat lain yang dicari untuk posisi ini." />
            {!p.description?.trim() && <div className="hint" style={{ marginTop: 4, color: 'var(--hold)' }}>Belum diisi: AI menilai CV dengan standar umum.</div>}
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Bobot kriteria CV</summary>
            <div style={{ marginTop: 8 }}>
              {CV_CRITERIA.map(cr => {
                const w = p.weights[cr.id as keyof PositionWeight] || 1
                return (
                  <div className="seg" key={cr.id}>
                    <span className="lbl">{cr.name}</span>
                    <div className="rate" style={{ gap: 5 }}>
                      {[1, 2, 3].map(n => (
                        <button key={n} type="button" className={w === n ? 'on' : ''} style={{ width: 32, height: 32 }}
                          aria-label={`${cr.name} bobot ${n}`} onClick={() => setWeight(p, cr.id, n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      ))}

    </>
  )
}
