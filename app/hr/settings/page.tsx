'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Position } from '@/lib/types'
import { CV_CRITERIA, POSITIONS_DEFAULT } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'

export default function HrSettingsPage() {
  const supabase = createClient()
  const [positions, setPositions] = useState<Position[]>([])

  const load = async () => {
    const { data: p } = await supabase.from('positions').select('*').order('name')
    setPositions((p && p.length > 0 ? p : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))) as Position[])
  }

  useEffect(() => { load() }, [])

  const setWeight = async (pid: string, cid: string, n: number) => {
    const pos = positions.find(p => p.id === pid)
    if (!pos) return
    pos.weights[cid as keyof typeof pos.weights] = n
    await supabase.from('positions').upsert({ id: pid, name: pos.name, weights: pos.weights })
    setPositions([...positions])
  }

  const rename = async (pid: string, name: string) => {
    await supabase.from('positions').upsert({ id: pid, name: name.trim() || 'Posisi', weights: positions.find(p => p.id === pid)!.weights })
    setPositions(positions.map(p => p.id === pid ? { ...p, name: name.trim() || 'Posisi' } : p))
  }

  const addPos = async () => {
    const newPos: Position = {
      id: uuidv4(), name: 'Posisi Baru',
      weights: Object.fromEntries(CV_CRITERIA.map(c => [c.id, 2])) as any,
    }
    await supabase.from('positions').insert(newPos)
    setPositions([...positions, newPos])
  }

  const delPos = async (pid: string) => {
    if (positions.length <= 1) { alert('Minimal harus ada 1 posisi'); return }
    if (!confirm('Hapus posisi ini?')) return
    await supabase.from('positions').delete().eq('id', pid)
    setPositions(positions.filter(p => p.id !== pid))
  }

  const resetPos = async () => {
    if (!confirm('Kembalikan posisi & bobot ke pengaturan awal?')) return
    for (const p of positions) {
      await supabase.from('positions').delete().eq('id', p.id)
    }
    const defaults = JSON.parse(JSON.stringify(POSITIONS_DEFAULT))
    for (const p of defaults) {
      await supabase.from('positions').insert(p)
    }
    setPositions(defaults)
  }

  const exportData = async () => {
    const { data: candidates } = await supabase.from('candidates').select('*').order('tanggal', { ascending: false })
    const { data: pos } = await supabase.from('positions').select('*')
    const blob = new Blob([JSON.stringify({ candidates: candidates || [], positions: pos || [] }, null, 2)], { type: 'application/json' })
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
        for (const c of d.candidates) await supabase.from('candidates').upsert(c)
      }
      if (d.positions?.length) {
        for (const p of d.positions) {
          const { data: existing } = await supabase.from('positions').select('id').eq('id', p.id).maybeSingle()
          if (existing) await supabase.from('positions').update(p).eq('id', p.id)
          else await supabase.from('positions').insert(p)
        }
      }
      await load()
      alert('Data berhasil diimpor')
    } catch { alert('File tidak valid') }
  }

  const wipe = async () => {
    if (!confirm('Yakin hapus SEMUA data kandidat? Tindakan ini tidak bisa dibatalkan.')) return
    await supabase.from('candidates').delete().neq('id', 'none')
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
              const w = (p.weights as any)[cr.id] || 1
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

      <button className="btn primary" onClick={addPos}>＋ Tambah posisi</button>
      <button className="btn" style={{ marginLeft: 8 }} onClick={resetPos}>Reset ke bawaan</button>

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
