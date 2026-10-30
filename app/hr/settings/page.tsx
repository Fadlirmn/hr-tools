'use client'

import { useEffect, useState } from 'react'
import { getPositions } from '@/lib/db'
import { fetchCandidates } from '@/lib/db-hr'
import type { Position, PositionWeight } from '@/lib/types'
import { CV_CRITERIA, POSITIONS_DEFAULT } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'

export default function HrSettingsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [newPosName, setNewPosName] = useState('')

  const load = async () => {
    setPositions(await getPositions())
  }

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  const upsertPosition = (p: Position) =>
    fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(p),
    })

  const deletePosition = (id: string) =>
    fetch('/api/positions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    })

  const setWeight = async (pid: string, cid: string, n: number) => {
    const pos = positions.find(p => p.id === pid)
    if (!pos) return
    pos.weights[cid as keyof typeof pos.weights] = n
    await upsertPosition(pos)
    setPositions([...positions])
  }

  const rename = async (pid: string, name: string) => {
    const pos = positions.find(p => p.id === pid)!
    const newName = name.trim() || 'Posisi'
    await upsertPosition({ ...pos, name: newName })
    setPositions(positions.map(p => p.id === pid ? { ...p, name: newName } : p))
  }

  const slugifyPosition = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'posisi'

  const addPosManual = async () => {
    const name = newPosName.trim()
    if (!name) { alert('Isi nama posisi dulu'); return }
    if (positions.some(p => p.name.toLowerCase() === name.toLowerCase())) { alert('Nama posisi sudah ada'); return }
    let id = `${slugifyPosition(name)}-${uuidv4().slice(0, 4)}`
    if (positions.some(p => p.id === id)) id = `${slugifyPosition(name)}-${uuidv4().slice(0, 4)}`
    const newPos: Position = {
      id, name,
      weights: Object.fromEntries(CV_CRITERIA.map(c => [c.id, 2])) as unknown as PositionWeight,
    }
    await upsertPosition(newPos)
    setPositions([...positions, newPos])
    setNewPosName('')
  }

  const delPos = async (pid: string) => {
    if (positions.length <= 1) { alert('Minimal harus ada 1 posisi'); return }
    if (!confirm('Hapus posisi ini?')) return
    await deletePosition(pid)
    setPositions(positions.filter(p => p.id !== pid))
  }

  const resetPos = async () => {
    if (!confirm('Kembalikan 6 posisi bawaan? Posisi custom manual tidak dihapus.')) return
    for (const oldId of ['videoeditor', 'sosmed', 'designer', 'admin']) {
      await deletePosition(oldId)
    }
    const defaults = JSON.parse(JSON.stringify(POSITIONS_DEFAULT))
    for (const p of defaults) await upsertPosition(p)
    await load()
  }

  const exportData = async () => {
    const candidates = await fetchCandidates()
    const pos = await getPositions()
    const blob = new Blob([JSON.stringify({ candidates, positions: pos }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'hr-data-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
  }

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    try {
      const d = JSON.parse(text)
      if (d.candidates?.length) {
        for (const c of d.candidates) {
          await fetch('/api/candidates', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(c),
          })
        }
      }
      if (d.positions?.length) {
        for (const p of d.positions) await upsertPosition(p)
      }
      await load()
      alert('Data berhasil diimpor')
    } catch { alert('File tidak valid') }
  }

  const wipe = async () => {
    if (!confirm('Yakin hapus SEMUA data kandidat? Tindakan ini tidak bisa dibatalkan.')) return
    await fetch('/api/candidates', { method: 'DELETE', credentials: 'include' })
    setPositions([...positions])
  }

  return (
    <>
      <div className="notice">ℹ️ Atur bobot tiap kriteria CV per posisi (skala 1–3). Bobot lebih tinggi = kriteria lebih menentukan skor akhir.</div>

      {positions.map(p => (
        <div className="card card-p" style={{ marginBottom: 14 }} key={p.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input type="text" defaultValue={p.name}
              onBlur={e => rename(p.id, e.target.value)}
              style={{ maxWidth: 340, fontWeight: 700 }} />
            <button className="btn sm danger" onClick={() => delPos(p.id)}>Hapus posisi</button>
          </div>
          <div style={{ marginTop: 14 }}>
            {CV_CRITERIA.map(cr => {
              const w = p.weights[cr.id as keyof PositionWeight] || 1
              return (
                <div className="seg" key={cr.id}>
                  <span className="lbl">{cr.name}</span>
                  <div className="rate" style={{ gap: 5 }}>
                    {[1, 2, 3].map(n => (
                      <button key={n} className={w === n ? 'on' : ''}
                        style={{ width: 32, height: 32 }}
                        onClick={() => setWeight(p.id, cr.id, n)}>{n}</button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="text" value={newPosName} onChange={e => setNewPosName(e.target.value)}
          placeholder="cth. Marketing" style={{ maxWidth: 340 }} />
        <button className="btn primary" onClick={addPosManual}>＋ Tambah manual</button>
        <button className="btn" onClick={resetPos}>Reset ke bawaan</button>
      </div>

      <div className="card card-p" style={{ marginTop: 22 }}>
        <h4 className="blk" style={{ marginTop: 0 }}>Backup & Pemulihan Data</h4>
        <p className="hint" style={{ marginBottom: 16 }}>Data tersimpan otomatis di database. Untuk cadangan aman, ekspor ke file JSON.</p>
        <button className="btn primary" onClick={exportData}>⤓ Ekspor data (.json)</button>
        <label className="btn" style={{ marginLeft: 8, cursor: 'pointer' }}>
          ⤒ Impor data
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importData} />
        </label>
        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '22px 0' }} />
        <button className="btn danger" onClick={wipe}>Hapus semua data kandidat</button>
      </div>
    </>
  )
}
