'use client'

import { useState } from 'react'
import { getPositions } from '@/lib/db'
import { fetchCandidates } from '@/lib/db-hr'
import { savePosition } from '@/lib/positions'
import type { Candidate, Position } from '@/lib/types'
import { IconAlert, IconInfo } from '@/components/icons'

// Data & Backup: ekspor, impor, dan hapus semua data kandidat (dipindah dari halaman Posisi).
export default function HrDataPage() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const exportData = async () => {
    const [candidates, positions] = await Promise.all([fetchCandidates(), getPositions()])
    const blob = new Blob([JSON.stringify({ candidates, positions }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'hr-data-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    setMsg({ ok: true, text: `Diekspor: ${(candidates as Candidate[]).length} kandidat, ${positions.length} posisi.` })
  }

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    let d: { candidates?: Candidate[]; positions?: Position[] }
    try { d = JSON.parse(await f.text()) } catch { setMsg({ ok: false, text: 'File bukan JSON yang valid.' }); return }
    const cands = Array.isArray(d.candidates) ? d.candidates : []
    const pos = Array.isArray(d.positions) ? d.positions : []
    if (!cands.length && !pos.length) { setMsg({ ok: false, text: 'File tidak berisi kandidat atau posisi.' }); return }
    if (!confirm(`Impor ${pos.length} posisi dan ${cands.length} kandidat?\nData kandidat yang masih ada akan DITIMPA isi file (tahap, penilaian, hasil tes). Kandidat yang sudah dihapus tidak dibuat ulang.`)) return

    setBusy(true)
    let posOk = 0, updated = 0, skipped = 0, failed = 0
    try {
      // Posisi dulu, agar kandidat yang merujuk posisi itu valid
      for (const p of pos) { try { await savePosition(p); posOk++ } catch { failed++ } }
      const existing = new Set((await fetchCandidates() as Candidate[]).map(c => c.id))
      for (const c of cands) {
        if (!existing.has(c.id)) { skipped++; continue }
        const res = await fetch('/api/candidates', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(c),
        })
        if (res.ok) updated++; else failed++
      }
      setMsg({
        ok: failed === 0,
        text: `Impor selesai: ${posOk} posisi, ${updated} kandidat diperbarui` +
          (skipped ? `, ${skipped} kandidat dilewati (sudah tidak ada)` : '') + (failed ? `, ${failed} gagal` : '') + '.',
      })
    } finally {
      setBusy(false)
    }
  }

  const wipe = async () => {
    const typed = prompt('Semua kandidat, file CV, dan penilaiannya akan dihapus permanen.\nKetik HAPUS untuk melanjutkan.')
    if (typed !== 'HAPUS') { if (typed !== null) setMsg({ ok: false, text: 'Dibatalkan: teks tidak sesuai.' }); return }
    setBusy(true)
    try {
      const res = await fetch('/api/candidates', { method: 'DELETE', credentials: 'include' })
      setMsg(res.ok ? { ok: true, text: 'Semua data kandidat dihapus.' } : { ok: false, text: 'Gagal menghapus data.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {msg && <div className="hint" role="status" style={{ margin: '0 0 12px', color: msg.ok ? 'var(--ok)' : 'var(--no)' }}>{msg.text}</div>}

      <div className="card card-p" style={{ marginBottom: 16 }}>
        <h4 className="blk" style={{ marginTop: 0 }}>Ekspor & impor</h4>
        <div className="notice" style={{ marginBottom: 14 }}>
          <IconInfo size={16} style={{ marginTop: 1, color: 'var(--violet)' }} />
          <div>Data tersimpan otomatis di database. File ekspor (JSON) berisi data kandidat dan posisi, <b>tanpa file CV</b>.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={exportData} disabled={busy}>⤓ Ekspor data (.json)</button>
          <label className="btn" style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            ⤒ Impor data
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importData} disabled={busy} />
          </label>
        </div>
      </div>

      <div className="card card-p">
        <h4 className="blk" style={{ marginTop: 0, color: 'var(--no)', display: 'flex', gap: 6, alignItems: 'center' }}><IconAlert size={16} />Hapus semua data kandidat</h4>
        <p className="hint" style={{ marginBottom: 12 }}>Menghapus semua kandidat beserta file CV dan penilaiannya. Akun login kandidat tidak ikut terhapus (kelola di Manajemen User). Tidak bisa dibatalkan, ekspor dulu bila perlu.</p>
        <button className="btn danger" onClick={wipe} disabled={busy}>Hapus semua data kandidat</button>
      </div>
    </>
  )
}
