'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPositions } from '@/lib/db'
import type { Candidate, Position, PositionWeight } from '@/lib/types'
import { STAGES, CV_CRITERIA, rejectReasonLabel } from '@/lib/constants'
import { IconPaperclip, IconEye, IconEdit, IconTrash } from '@/components/icons'
import { isValidPhone, PHONE_ERROR, PHONE_HINT } from '@/lib/phone'
import { v4 as uuidv4 } from 'uuid'
import { CV_ACCEPT, CV_FORMAT_HINT, CV_MAX_BYTES } from '@/lib/cv-file'

const SUMBER_OPTIONS = ['LinkedIn', 'Instagram/TikTok', 'Glints', 'KitaLulus', 'JobStreet', 'Referensi', 'Walk-in', 'Lainnya']

type BulkItem = { name: string; status: 'antri' | 'upload' | 'ok' | 'gagal'; msg?: string }

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
  const [editOrigPosisi, setEditOrigPosisi] = useState('')
  const [form, setForm] = useState({ nama: '', posisi: '', sumber: 'LinkedIn', email: '', telepon: '', catatan: '' })
  const [showAddPos, setShowAddPos] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  const [savingPos, setSavingPos] = useState(false)

  const [showBulk, setShowBulk] = useState(false)
  // Baris yang disorot (dibuka dari Asisten Screening: ?highlight=<id>)
  const [hl, setHl] = useState('')
  const [bulkPos, setBulkPos] = useState('')
  const [bulkSumber, setBulkSumber] = useState('Glints')
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)

  const load = async () => {
    const res = await fetch('/api/candidates', { credentials: 'include' })
    const cData = res.ok ? await res.json() : { candidates: [] }
    setCandidates((cData.candidates || []) as Candidate[])
    const pos = await getPositions()
    setPositions(pos)
    return pos
  }


  const focusRow = (id: string) => {
    setHl(id)
    // tunggu baris ter-render, lalu gulir & fokuskan
    setTimeout(() => {
      const row = document.getElementById(`cand-row-${id}`)
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      row?.querySelector<HTMLButtonElement>('.cand-name')?.focus({ preventScroll: true })
    }, 50)
    setTimeout(() => setHl(cur => (cur === id ? '' : cur)), 4000)
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
        // Dibuka oleh Asisten Screening dari halaman lain
        if (sessionStorage.getItem('open-bulk-upload') === '1') {
          sessionStorage.removeItem('open-bulk-upload')
          setBulkPos(pos[0]?.id || '')
          setBulkFiles([])
          setBulkItems([])
          setShowBulk(true)
        }
      } catch { /* abaikan */ }
      const h = new URLSearchParams(window.location.search).get('highlight')
      if (h) focusRow(h)
    })()
    // Dibuka via tombol topbar saat sudah di halaman ini
    const handler = () => {
      setEditId(null)
      setForm(prev => ({ nama: '', posisi: positionsRef.current[0]?.id || prev.posisi, sumber: 'LinkedIn', email: '', telepon: '', catatan: '' }))
      setShowAddPos(false)
      setNewPosName('')
      setShowModal(true)
    }
    const hlHandler = (e: Event) => focusRow((e as CustomEvent<{ id: string }>).detail.id)
    window.addEventListener('highlight-candidate', hlHandler)
    const bulkHandler = () => {
      setBulkPos(positionsRef.current[0]?.id || '')
      setBulkFiles([])
      setBulkItems([])
      setShowBulk(true)
    }
    window.addEventListener('open-add-candidate', handler)
    window.addEventListener('open-bulk-upload', bulkHandler)
    return () => {
      window.removeEventListener('open-add-candidate', handler)
      window.removeEventListener('open-bulk-upload', bulkHandler)
      window.removeEventListener('highlight-candidate', hlHandler)
    }
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
    setEditOrigPosisi(c.posisi)
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
      if (!form.posisi) { alert('Pilih posisi dilamar dulu'); return }
      if (form.posisi !== editOrigPosisi) {
        const ok = confirm(`Ubah posisi dari "${posName(editOrigPosisi)}" ke "${posName(form.posisi)}"?\nHasil tes yang sudah ada tetap memakai bobot posisi lama.`)
        if (!ok) return
      }
      const res = await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editId,
          nama: form.nama.trim(), posisi: form.posisi, sumber: form.sumber,
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

  const openBulk = () => {
    setBulkPos(positions[0]?.id || '')
    setBulkFiles([])
    setBulkItems([])
    setShowBulk(true)
  }

  const pickBulkFiles = (list: FileList | null) => {
    const files = Array.from(list || [])
    setBulkFiles(files)
    setBulkItems(files.map(f => ({
      name: f.name,
      status: f.size > CV_MAX_BYTES ? 'gagal' : 'antri',
      msg: f.size > CV_MAX_BYTES ? 'Lebih dari 5 MB' : undefined,
    })))
  }

  const runBulk = async () => {
    if (!bulkPos) { alert('Pilih posisi dulu'); return }
    if (bulkFiles.length === 0) { alert('Pilih file CV dulu'); return }
    setBulkRunning(true)
    const update = (i: number, patch: Partial<BulkItem>) =>
      setBulkItems(prev => prev.map((it, j) => j === i ? { ...it, ...patch } : it))
    try {
      for (let i = 0; i < bulkFiles.length; i++) {
        const f = bulkFiles[i]
        if (f.size > CV_MAX_BYTES) continue
        update(i, { status: 'upload' })
        const fd = new FormData()
        fd.append('file', f)
        fd.append('posisi', bulkPos)
        fd.append('sumber', bulkSumber)
        try {
          const res = await fetch('/api/cv-bulk', { method: 'POST', credentials: 'include', body: fd })
          const d = await res.json().catch(() => ({}))
          if (res.ok) update(i, { status: 'ok', msg: d.ai === 'processing' ? 'Tersimpan · AI menganalisis' : 'Tersimpan' })
          else update(i, { status: 'gagal', msg: d.error || String(res.status) })
        } catch {
          update(i, { status: 'gagal', msg: 'Koneksi gagal' })
        }
      }
    } finally {
      setBulkRunning(false)
      setBulkFiles([]) // cegah upload ganda bila tombol diklik lagi
      await load()
    }
  }

  const scoreChip = (v: string, txt: string) => {
    const m: Record<string, string> = { Lolos: 'ok', Pertimbangkan: 'hold', 'Tidak Lolos': 'no', Rekomendasikan: 'ok', Tidak: 'no' }
    return <span className={`chip ${m[v] || 'neutral'}`}>{txt}</span>
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button className="btn primary" onClick={openAdd}>＋ Kandidat Baru</button>
        <button className="btn" style={{ marginLeft: 8 }} onClick={openBulk}>⬆ Upload CV massal</button>
      </div>

      {candidates.length === 0 ? (
        <div className="card card-p">
          <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Belum ada kandidat</div><div className="hint" style={{ marginTop: 4 }}>Tambahkan kandidat untuk memulai proses seleksi.</div></div>
        </div>
      ) : (
        <div className="card card-p">
          <div className="table-wrap">
            <table className="tbl tbl-fit cand-table">
            <thead><tr><th>Kandidat</th><th>Tahap</th><th>Hasil seleksi</th><th>Akun</th><th><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id} id={`cand-row-${c.id}`} className={hl === c.id ? 'row-hl' : undefined}>
                  <td className="cell-cand">
                    <button type="button" className="cand-name linkish" onClick={() => router.push(`/hr/candidates/${c.id}`)}>{c.nama}</button>
                    <div className="hint">{posName(c.posisi)} · {c.sumber || '—'}{c.tanggal ? ` · ${c.tanggal}` : ''}</div>
                  </td>
                  <td>
                    <select value={c.stage} onChange={e => setStage(c.id, e.target.value)} aria-label={`Tahap ${c.nama}`}
                      className={`stage-select s-${c.stage}`}
                      title={c.stage === 'rejected' && c.cv?.reject_reason ? `Alasan: ${rejectReasonLabel(c.cv.reject_reason)}` : undefined}>
                      {Object.entries(STAGES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="results">
                      <span className="res" title={c.has_cv_file ? 'CV sudah diupload' : 'CV belum diupload'}>
                        <span className="k">CV</span>
                        {c.has_cv_file && <IconPaperclip size={13} />}
                        {c.cv ? scoreChip(c.cv.verdict, c.cv.percent + '%')
                          : c.ai_percent != null ? <span className="chip neutral" title="Draft AI, belum dinilai HR">AI {c.ai_percent}%</span>
                          : <span className="hint">—</span>}
                      </span>
                      <span className="res"><span className="k">DISC</span>{c.psikotes_result?.disc ? <b>{c.psikotes_result.disc.adapted.pattern.type}</b> : <span className="hint">—</span>}</span>
                      <span className="res"><span className="k">IQ</span>{c.psikotes_result?.iq ? <b>{c.psikotes_result.iq.percent}%</b> : <span className="hint">—</span>}</span>
                      <span className="res"><span className="k">Interview</span>{c.interview ? scoreChip(c.interview.verdict, c.interview.avg.toFixed(1)) : <span className="hint">—</span>}</span>
                    </div>
                  </td>
                  <td className="nowrap">
                    {c.user_id ? (
                      <span className="chip ok">Terdaftar</span>
                    ) : (
                      <button className="btn sm ghost" onClick={() => generateInvite(c)} title="Kirim undangan akun ke kandidat">
                        {c.invite_token ? 'Kirim ulang' : 'Undang'}
                      </button>
                    )}
                  </td>
                  <td className="actions">
                    <button className="btn sm icon-btn" onClick={() => router.push(`/hr/candidates/${c.id}`)} aria-label={`Detail ${c.nama}`} title="Detail"><IconEye size={15} /></button>
                    <button className="btn sm icon-btn" onClick={() => openEdit(c)} aria-label={`Edit ${c.nama}`} title="Edit"><IconEdit size={15} /></button>
                    <button className="btn sm danger icon-btn" onClick={() => deleteC(c.id)} aria-label={`Hapus ${c.nama}`} title="Hapus"><IconTrash size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="modal-bg show" onClick={() => { if (!bulkRunning) setShowBulk(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Upload CV Massal</h3>
            <div className="body">
              <div className="hint" style={{ marginBottom: 12 }}>
                Setiap file CV menjadi satu kandidat baru (tahap Screening CV). Kalau screening otomatis aktif, nama, email, dan no. HP diisi dari CV, lalu draft skor AI muncul di menu Penilaian CV.
              </div>
              <div className="grid2">
                <div className="field"><label className="fld">Posisi dilamar *</label>
                  <select value={bulkPos} onChange={e => setBulkPos(e.target.value)} disabled={bulkRunning}>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                <div className="field"><label className="fld">Sumber</label>
                  <select value={bulkSumber} onChange={e => setBulkSumber(e.target.value)} disabled={bulkRunning}>
                    {SUMBER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
              <div className="field"><label className="fld">File CV</label>
                <input type="file" multiple accept={CV_ACCEPT} disabled={bulkRunning} onChange={e => pickBulkFiles(e.target.files)} />
                <div className="hint" style={{ marginTop: 4 }}>{CV_FORMAT_HINT}</div></div>
              {bulkItems.length > 0 && (
                <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                  {bulkItems.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                      <span className={`chip ${it.status === 'ok' ? 'ok' : it.status === 'gagal' ? 'no' : it.status === 'upload' ? 'hold' : 'neutral'}`}>
                        {it.status === 'upload' ? 'Mengupload…' : it.msg || (it.status === 'antri' ? 'Antri' : it.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="foot">
              <button className="btn" disabled={bulkRunning} onClick={() => setShowBulk(false)}>Tutup</button>
              <button className="btn primary" disabled={bulkRunning || bulkFiles.length === 0} onClick={runBulk}>
                {bulkRunning ? 'Memproses…' : `Upload ${bulkFiles.length || ''} CV`}
              </button>
            </div>
          </div>
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
                    {editId && form.posisi !== editOrigPosisi && (
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
              <button className="btn" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn primary" onClick={save}>{editId ? 'Simpan perubahan' : 'Simpan kandidat'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
