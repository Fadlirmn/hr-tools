'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPositions } from '@/lib/db'
import type { Candidate, Position, PositionWeight } from '@/lib/types'
import { STAGES, CV_CRITERIA } from '@/lib/constants'
import { isValidPhone, PHONE_ERROR, PHONE_HINT } from '@/lib/phone'
import { v4 as uuidv4 } from 'uuid'

function slugifyPosition(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'posisi'
  return slug
}

export default function HrCandidatesPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  // Ref agar event listener (didaftar sekali) selalu baca positions terbaru
  const positionsRef = useRef<Position[]>([])
  useEffect(() => { positionsRef.current = positions }, [positions])

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nama: '', posisi: '', sumber: 'LinkedIn', email: '', telepon: '', catatan: '' })
  const [showAddPos, setShowAddPos] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  const [savingPos, setSavingPos] = useState(false)

  const load = async () => {
    const res = await fetch('/api/candidates', { credentials: 'include' })
    const cData = res.ok ? await res.json() : { candidates: [] }
    setCandidates((cData.candidates || []) as Candidate[])
    const pos = await getPositions()
    setPositions(pos)
    return pos
  }


  useEffect(() => {
    ;(async () => {
      const pos = await load()
      // Dibuka via tombol "＋ Kandidat Baru" di topbar dari halaman lain
      try {
        if (sessionStorage.getItem('open-add-candidate') === '1') {
          sessionStorage.removeItem('open-add-candidate')
          setEditId(null)
          setForm({ nama: '', posisi: pos[0]?.id || '', sumber: 'LinkedIn', email: '', telepon: '', catatan: '' })
          setShowAddPos(false)
          setNewPosName('')
          setShowModal(true)
        }
      } catch { /* abaikan */ }
    })()
    // Dibuka via tombol topbar saat sudah di halaman ini
    const handler = () => {
      setEditId(null)
      setForm(prev => ({ nama: '', posisi: positionsRef.current[0]?.id || prev.posisi, sumber: 'LinkedIn', email: '', telepon: '', catatan: '' }))
      setShowAddPos(false)
      setNewPosName('')
      setShowModal(true)
    }
    window.addEventListener('open-add-candidate', handler)
    return () => window.removeEventListener('open-add-candidate', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'

  const openAdd = () => {
    setEditId(null)
    setForm({ nama: '', posisi: positions[0]?.id || '', sumber: 'LinkedIn', email: '', telepon: '', catatan: '' })
    setShowAddPos(false)
    setNewPosName('')
    setShowModal(true)
  }

  const openEdit = (c: Candidate) => {
    setEditId(c.id)
    setForm({ nama: c.nama, posisi: c.posisi, sumber: c.sumber || 'LinkedIn', email: c.email || '', telepon: c.telepon || '', catatan: c.catatan || '' })
    setShowAddPos(false)
    setNewPosName('')
    setShowModal(true)
  }

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newPos),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({ error: 'gagal' })); alert('Gagal tambah posisi: ' + (d.error || res.status)); return }
      const next = [...positions, newPos as Position]
      setPositions(next)
      positionsRef.current = next
      setForm(prev => ({ ...prev, posisi: id }))
      setNewPosName('')
      setShowAddPos(false)
    } finally {
      setSavingPos(false)
    }
  }

  const save = async () => {
    if (!form.nama.trim()) return
    if (!isValidPhone(form.telepon)) { alert(PHONE_ERROR); return }
    if (editId) {
      // Mode Edit: posisi disembunyikan & tidak dikirim agar data lama tetap.
      const res = await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editId,
          nama: form.nama.trim(), sumber: form.sumber,
          email: form.email.trim(), telepon: form.telepon.trim(), catatan: form.catatan.trim(),
        }),
      })
      if (!res.ok) { const d = await res.json(); alert('Gagal: ' + d.error); return }
    } else {
      if (!form.posisi) { alert('Pilih posisi dilamar dulu'); return }
      const newC: Candidate = {
        id: uuidv4(), user_id: null, nama: form.nama.trim(), posisi: form.posisi,
        sumber: form.sumber, email: form.email.trim(), telepon: form.telepon.trim(),
        catatan: form.catatan.trim(), stage: 'screening',
        tanggal: new Date().toISOString().slice(0, 10),
        invite_token: null, cv: null,
        psikotes: null, psikotes_open_at: null, psikotes_close_at: null, psikotes_time_limit: null,
        psikotes_result: null, disc_open_at: null, disc_close_at: null, disc_time_limit: null,
        iq_open_at: null, iq_close_at: null, iq_time_limit: null, disc_started_at: null, iq_started_at: null,
        interview: null, onboarding: null,
      }
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newC),
      })
      if (!res.ok) { const d = await res.json(); alert('Gagal: ' + d.error); return }
    }
    setShowModal(false)
    await load()
  }


  const deleteC = async (id: string) => {
    if (!confirm('Hapus kandidat ini beserta seluruh penilaiannya?')) return
    await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ candidateId: id }),
    })
    await load()
  }

  const setStage = async (id: string, stage: string) => {
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, stage }),
    })
    await load()
  }

  const generateInvite = async (c: Candidate) => {
    if (c.user_id) return
    let token = c.invite_token
    if (!token) {
      token = uuidv4()
      const res = await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: c.id, invite_token: token }),
      })
      if (!res.ok) { const d = await res.json(); alert('Gagal: ' + d.error); return }
    }
    // Base URL: pakai domain publik dari env bila ada. window.location.origin
    // ikut localhost saat HR akses via localhost → link tidak bisa dibuka device lain.
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || window.location.origin
    const link = `${base}/invite/${token}`
    if (base.includes('localhost') || base.includes('127.0.0.1')) {
      alert(`Link undangan (PERHATIAN: masih localhost, tidak bisa dibuka dari device lain):\n${link}\n\nAgar bisa dibuka kandidat, set NEXT_PUBLIC_APP_URL ke domain publik lalu rebuild/restart.`)
    }
    try {
      await navigator.clipboard.writeText(link)
      alert(c.invite_token ? `Link undangan disalin ulang:\n${link}` : `Link undangan disalin:\n${link}`)
    } catch {
      prompt('Salin link undangan ini secara manual:', link)
    }
    await load()
  }

  const scoreChip = (v: string, txt: string) => {
    const m: Record<string, string> = { Lolos: 'ok', Pertimbangkan: 'hold', 'Tidak Lolos': 'no', Rekomendasikan: 'ok', Tidak: 'no' }
    return <span className={`chip ${m[v] || 'neutral'}`}>{txt}</span>
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button className="btn primary" onClick={openAdd}>＋ Kandidat Baru</button>
      </div>

      {candidates.length === 0 ? (
        <div className="card card-p">
          <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Belum ada kandidat</div><div className="hint" style={{ marginTop: 4 }}>Tambahkan kandidat untuk memulai proses seleksi.</div></div>
        </div>
      ) : (
        <div className="card card-p">
            <table className="tbl">
            <thead><tr><th>Nama</th><th>Posisi</th><th>Sumber</th><th>Tahap</th><th>CV</th><th>DISC</th><th>IQ</th><th>Interview</th><th>Undangan</th><th></th></tr></thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id}>
                  <td className="cand-name" onClick={() => router.push(`/hr/candidates/${c.id}`)}>
                    {c.nama}<div className="hint">{c.tanggal || ''}</div>
                  </td>
                  <td>{posName(c.posisi)}</td>
                  <td>{c.sumber || '—'}</td>
                  <td>
                    <select value={c.stage} onChange={e => setStage(c.id, e.target.value)}
                      style={{ width: 'auto', padding: '3px 8px', fontSize: 11, fontWeight: 700, borderRadius: 999, border: '1px solid var(--line)' }}>
                      {Object.entries(STAGES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td>{c.cv ? scoreChip(c.cv.verdict, c.cv.percent + '%') : <span className="hint">—</span>}</td>
                  <td>{c.psikotes_result?.disc ? <b>{c.psikotes_result.disc.adapted.pattern.type}</b> : <span className="hint">—</span>}</td>
                  <td>{c.psikotes_result?.iq ? <b>{c.psikotes_result.iq.percent}%</b> : <span className="hint">—</span>}</td>
                  <td>{c.interview ? scoreChip(c.interview.verdict, c.interview.avg.toFixed(1)) : <span className="hint">—</span>}</td>
                  <td>
                    {c.user_id ? (
                      <span className="chip ok">Terdaftar</span>
                    ) : (
                      <button className="btn sm ghost" onClick={() => generateInvite(c)}>
                        {c.invite_token ? 'Kirim Ulang' : 'Kirim'}
                      </button>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn sm" onClick={() => router.push(`/hr/candidates/${c.id}`)}>Detail</button>
                    <button className="btn sm ghost" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn sm danger" onClick={() => deleteC(c.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-bg show" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editId ? 'Edit Kandidat' : 'Kandidat Baru'}</h3>
            <div className="body">
              <div className="field"><label className="fld">Nama lengkap *</label>
                <input type="text" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="cth. Sarah Putri" /></div>
              <div className="grid2">
                {editId ? (
                  <div className="field"><label className="fld">Posisi dilamar</label>
                    <div className="chip" style={{ width: 'fit-content' }}>{posName(form.posisi)} (terkunci)</div></div>
                ) : (
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
                    )}</div>
                )}
                <div className="field"><label className="fld">Sumber</label>
                  <select value={form.sumber} onChange={e => setForm({ ...form, sumber: e.target.value })}>
                    {['LinkedIn', 'Instagram/TikTok', 'JobStreet', 'Glints', 'Referensi', 'Walk-in', 'Lainnya'].map(s =>
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
              <button className="btn" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn primary" onClick={save}>{editId ? 'Simpan perubahan' : 'Simpan kandidat'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
