'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Candidate, Position } from '@/lib/types'
import { STAGES, POSITIONS_DEFAULT } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'

export default function HrCandidatesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nama: '', posisi: '', sumber: 'LinkedIn', email: '', telepon: '', catatan: '' })

  const load = async () => {
    const { data: c } = await supabase.from('candidates').select('*').order('tanggal', { ascending: false })
    const { data: p } = await supabase.from('positions').select('*')
    setCandidates((c || []) as Candidate[])
    setPositions((p && p.length > 0 ? p : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))) as Position[])
  }

  useEffect(() => { load() }, [])

  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'

  const openAdd = () => {
    setEditId(null)
    setForm({ nama: '', posisi: positions[0]?.id || '', sumber: 'LinkedIn', email: '', telepon: '', catatan: '' })
    setShowModal(true)
  }

  const openEdit = (c: Candidate) => {
    setEditId(c.id)
    setForm({ nama: c.nama, posisi: c.posisi, sumber: c.sumber || 'LinkedIn', email: c.email || '', telepon: c.telepon || '', catatan: c.catatan || '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.nama.trim()) return
    // Refresh JWT so RLS gets the latest user_metadata.role
    // (needed when role was set via SQL editor without re-login)
    await supabase.auth.refreshSession()
    if (editId) {
      const { error } = await supabase.from('candidates').update({
        nama: form.nama.trim(), posisi: form.posisi, sumber: form.sumber,
        email: form.email.trim(), telepon: form.telepon.trim(), catatan: form.catatan.trim(),
      }).eq('id', editId)
      if (error) { alert('Gagal menyimpan: ' + error.message); return }
    } else {
      const newC: Candidate = {
        id: uuidv4(), user_id: null, nama: form.nama.trim(), posisi: form.posisi,
        sumber: form.sumber, email: form.email.trim(), telepon: form.telepon.trim(),
        catatan: form.catatan.trim(), stage: 'screening',
        tanggal: new Date().toISOString().slice(0, 10),
        invite_token: null, cv: null, psikotes: null, psikotes_open_at: null, psikotes_close_at: null, psikotes_time_limit: null, interview: null, onboarding: null,
      }
      const { error } = await supabase.from('candidates').insert(newC)
      if (error) { alert('Gagal menambah kandidat: ' + error.message); return }
    }
    setShowModal(false)
    await load()
  }

  const deleteC = async (id: string) => {
    if (!confirm('Hapus kandidat ini beserta seluruh penilaiannya?')) return
    await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: id }),
    })
    await load()
  }

  const setStage = async (id: string, stage: string) => {
    await supabase.from('candidates').update({ stage } as any).eq('id', id)
    await load()
  }

  const generateInvite = async (c: Candidate) => {
    if (c.user_id) return
    let token = c.invite_token
    if (!token) {
      token = uuidv4()
      const { error } = await supabase.from('candidates').update({ invite_token: token } as any).eq('id', c.id)
      if (error) { alert('Gagal: ' + error.message); return }
    }
    const link = `${window.location.origin}/invite/${token}`
    // Clipboard API memerlukan HTTPS; fallback ke prompt() jika gagal
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
            <thead><tr><th>Nama</th><th>Posisi</th><th>Sumber</th><th>Tahap</th><th>CV</th><th>Psikotes</th><th>Interview</th><th>Undangan</th><th></th></tr></thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id}>
                  <td className="cand-name" onClick={() => router.push(`/hr/cv?candidateId=${c.id}`)}>
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
                  <td>{c.psikotes ? <b>{c.psikotes.cogTotal}/15</b> : <span className="hint">—</span>}</td>
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
                <div className="field"><label className="fld">Posisi dilamar *</label>
                  <select value={form.posisi} onChange={e => setForm({ ...form, posisi: e.target.value })}>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
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
                  <input type="tel" value={form.telepon} onChange={e => setForm({ ...form, telepon: e.target.value })} placeholder="08xx" /></div>
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
