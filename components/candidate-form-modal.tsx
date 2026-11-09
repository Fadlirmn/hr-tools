'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { CV_CRITERIA, SUMBER_OPTIONS } from '@/lib/constants'
import { isValidPhone, PHONE_ERROR, PHONE_HINT } from '@/lib/phone'
import type { Candidate, Position, PositionWeight } from '@/lib/types'

function slugifyPosition(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'posisi'
}

interface Props {
  /** Kandidat yang diedit; null = kandidat baru */
  editing: Candidate | null
  positions: Position[]
  onPositionsChange: (next: Position[]) => void
  onClose: () => void
  onSaved: () => void | Promise<void>
}

/** Form tambah / edit kandidat (modal). */
export default function CandidateFormModal({ editing, positions, onPositionsChange, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => editing
    ? { nama: editing.nama, posisi: editing.posisi, sumber: editing.sumber || 'LinkedIn', email: editing.email || '', telepon: editing.telepon || '', catatan: editing.catatan || '' }
    : { nama: '', posisi: positions[0]?.id || '', sumber: 'LinkedIn', email: '', telepon: '', catatan: '' })
  const [showAddPos, setShowAddPos] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  const [savingPos, setSavingPos] = useState(false)
  const [saving, setSaving] = useState(false)
  const origPosisi = editing?.posisi || ''
  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'

  const saveQuickPosition = async () => {
    const name = newPosName.trim()
    if (!name) { alert('Isi nama posisi dulu'); return }
    if (positions.some(p => p.name.toLowerCase() === name.toLowerCase())) { alert('Nama posisi sudah ada'); return }
    setSavingPos(true)
    try {
      let id = `${slugifyPosition(name)}-${uuidv4().slice(0, 4)}`
      if (positions.some(p => p.id === id)) id = `${slugifyPosition(name)}-${uuidv4().slice(0, 4)}`
      const newPos = {
        id, name,
        weights: Object.fromEntries(CV_CRITERIA.map(c => [c.id, 2])) as unknown as PositionWeight,
      }
      const res = await fetch('/api/positions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(newPos),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({ error: 'gagal' })); alert('Gagal tambah posisi: ' + (d.error || res.status)); return }
      onPositionsChange([...positions, newPos as Position])
      setForm(prev => ({ ...prev, posisi: id }))
      setNewPosName('')
      setShowAddPos(false)
    } finally {
      setSavingPos(false)
    }
  }

  const save = async () => {
    if (!form.nama.trim() || saving) return
    if (!isValidPhone(form.telepon)) { alert(PHONE_ERROR); return }
    if (!form.posisi) { alert('Pilih posisi dilamar dulu'); return }
    if (editing && form.posisi !== origPosisi &&
      !confirm(`Ubah posisi dari "${posName(origPosisi)}" ke "${posName(form.posisi)}"?\nHasil tes yang sudah ada tetap memakai bobot posisi lama.`)) return
    setSaving(true)
    try {
      const fields = {
        nama: form.nama.trim(), posisi: form.posisi, sumber: form.sumber,
        email: form.email.trim(), telepon: form.telepon.trim(), catatan: form.catatan.trim(),
      }
      const body: Candidate | (typeof fields & { id: string }) = editing ? { id: editing.id, ...fields } : {
        id: uuidv4(), user_id: null, ...fields, stage: 'screening',
        tanggal: new Date().toISOString().slice(0, 10),
        invite_token: null, cv: null,
        psikotes: null, psikotes_open_at: null, psikotes_close_at: null, psikotes_time_limit: null,
        psikotes_result: null, disc_open_at: null, disc_close_at: null, disc_time_limit: null,
        iq_open_at: null, iq_close_at: null, iq_time_limit: null, disc_started_at: null, iq_started_at: null,
        interview: null, onboarding: null,
      }
      const res = await fetch('/api/candidates', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Gagal: ' + (d.error || res.status)); return }
      onClose()
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-bg show" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{editing ? 'Edit Kandidat' : 'Kandidat Baru'}</h3>
        <div className="body">
          <div className="field"><label className="fld">Nama lengkap *</label>
            <input type="text" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="cth. Sarah Putri" /></div>
          <div className="grid2">
            <div className="field"><label className="fld">Posisi dilamar *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={form.posisi} onChange={e => setForm({ ...form, posisi: e.target.value })} disabled={positions.length === 0} style={{ flex: 1 }}>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" className="btn sm" onClick={() => setShowAddPos(v => !v)}>＋ Baru</button>
              </div>
              {positions.length === 0 && <div className="hint" style={{ marginTop: 6 }}>Belum ada posisi — tambah manual dulu.</div>}
              {showAddPos && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input type="text" value={newPosName} onChange={e => setNewPosName(e.target.value)} placeholder="cth. Marketing" style={{ flex: 1 }} />
                  <button type="button" className="btn sm primary" disabled={savingPos} onClick={saveQuickPosition}>{savingPos ? '...' : 'Simpan'}</button>
                </div>
              )}
              {editing && form.posisi !== origPosisi && (
                <div className="hint" style={{ marginTop: 6 }}>Posisi diubah — hasil tes yang sudah ada tetap memakai bobot posisi lama.</div>
              )}</div>
            <div className="field"><label className="fld">Sumber</label>
              <select value={form.sumber} onChange={e => setForm({ ...form, sumber: e.target.value })}>
                {(SUMBER_OPTIONS.includes(form.sumber) ? SUMBER_OPTIONS : [...SUMBER_OPTIONS, form.sumber]).map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select></div>
          </div>
          <div className="grid2">
            <div className="field"><label className="fld">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" /></div>
            <div className="field"><label className="fld">No. HP</label>
              <input type="tel" inputMode="tel" value={form.telepon} onChange={e => setForm({ ...form, telepon: e.target.value })} placeholder="08xxxxxxxxxx" />
              <div className="hint" style={{ marginTop: 4 }}>{PHONE_HINT}</div></div>
          </div>
          <div className="field"><label className="fld">Catatan awal</label>
            <textarea value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} placeholder="cth. ekspektasi gaji, domisili, dsb."></textarea></div>
        </div>
        <div className="foot">
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={saving} onClick={save}>{editing ? 'Simpan perubahan' : 'Simpan kandidat'}</button>
        </div>
      </div>
    </div>
  )
}
