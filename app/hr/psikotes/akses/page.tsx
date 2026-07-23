'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchCandidates } from '@/lib/db-hr'
import type { Candidate, Position } from '@/lib/types'
import { POSITIONS_DEFAULT } from '@/lib/constants'

type AccessStatus = 'belum' | 'aktif' | 'kadaluarsa' | 'selesai'

interface CandidateRow {
  c: Candidate
  posName: string
  status: AccessStatus
}

export default function HrPsikotesAksesPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkTimeLimit, setBulkTimeLimit] = useState('30')
  const [bulkDays, setBulkDays] = useState('3')
  const [bulkFilter, setBulkFilter] = useState<'all' | 'screening'>('all')
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    const [candidates, pRes] = await Promise.all([
      fetchCandidates(),
      supabase.from('positions').select('*'),
    ])
    const positions = (pRes.data && pRes.data.length > 0 ? pRes.data : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))) as Position[]

    const now = new Date()
    const mapped: CandidateRow[] = (candidates as Candidate[]).map(c => {
      const posName = positions.find(p => p.id === c.posisi)?.name || '—'
      let status: AccessStatus = 'belum'

      if (c.psikotes) {
        status = 'selesai'
      } else if (c.psikotes_close_at) {
        const closeAt = new Date(c.psikotes_close_at)
        if (closeAt < now) {
          status = 'kadaluarsa'
        } else {
          status = 'aktif'
        }
      }

      return { c, posName, status }
    })

    setRows(mapped)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAccess = async (candidate: Candidate) => {
    const timeLimit = prompt('Batas waktu pengerjaan (menit):', '30')
    if (!timeLimit) return
    const days = prompt('Batas akhir (hari dari sekarang):', '3')
    if (!days) return

    const now = new Date()
    const closeAt = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000)

    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: candidate.id,
        psikotes_open_at: now.toISOString(),
        psikotes_close_at: closeAt.toISOString(),
        psikotes_time_limit: Number(timeLimit),
      }),
    })

    try {
      await fetch('/api/notify-psikotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      })
    } catch {}

    await load()
  }

  const openBulk = async () => {
    const eligible = rows.filter(({ c, status }) => {
      if (status === 'selesai') return false
      if (status === 'aktif') return false
      if (bulkFilter === 'screening' && c.stage !== 'screening' && c.stage !== 'psikotes') return false
      return true
    })

    if (eligible.length === 0) {
      alert('Tidak ada kandidat yang memenuhi kriteria.')
      return
    }

    const filterLabel = bulkFilter === 'all' ? 'SEMUA KANDIDAT' : 'KANDIDAT Screening / Psikotes'
    if (!confirm(`Buka akses psikotes untuk ${eligible.length} kandidat (${filterLabel})?\n\nWaktu: ${bulkTimeLimit} menit\nBatas akhir: ${bulkDays} hari`)) return

    setSending(true)
    const now = new Date()
    const closeAt = new Date(now.getTime() + Number(bulkDays) * 24 * 60 * 60 * 1000)
    const ids = eligible.map(r => r.c.id)

    const res = await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: ids[0], // bulk handled below
        _bulk: {
          ids,
          psikotes_open_at: now.toISOString(),
          psikotes_close_at: closeAt.toISOString(),
          psikotes_time_limit: Number(bulkTimeLimit),
        },
      }),
    })

    // Notify each candidate
    for (const r of eligible) {
      if (r.c.email) {
        try {
          await fetch('/api/notify-psikotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId: r.c.id }),
          })
        } catch {}
      }
    }

    setSending(false)
    await load()
  }

  const closeAccess = async (candidate: Candidate) => {
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: candidate.id,
        psikotes_open_at: null,
        psikotes_close_at: null,
        psikotes_time_limit: null,
      }),
    })
    await load()
  }

  const closeAccessEarly = async (candidate: Candidate) => {
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: candidate.id,
        psikotes_close_at: new Date().toISOString(),
      }),
    })
    await load()
  }

  const statusLabel: Record<AccessStatus, { text: string; cls: string }> = {
    belum: { text: 'Belum Dibuka', cls: 'neutral' },
    aktif: { text: 'Aktif', cls: 'ok' },
    kadaluarsa: { text: 'Kadaluarsa', cls: 'no' },
    selesai: { text: 'Selesai', cls: 'hold' },
  }

  if (loading) return <div className="hint">Memuat...</div>

  return (
    <>
      <div className="notice">
        Kelola akses psikotes mandiri untuk kandidat. Status <b>Aktif</b> berarti kandidat dapat mengerjakan tes dari portal mereka dalam batas waktu yang ditentukan.
      </div>

      <div className="card card-p" style={{ marginBottom: 16, border: '1.5px solid var(--violet)' }}>
        <h4 className="blk" style={{ marginTop: 0 }}>Buka Akses untuk Semua</h4>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ minWidth: 140, flex: 1 }}>
            <label className="fld">Batas waktu (menit)</label>
            <input type="number" value={bulkTimeLimit} onChange={e => setBulkTimeLimit(e.target.value)} min={1} />
          </div>
          <div className="field" style={{ minWidth: 140, flex: 1 }}>
            <label className="fld">Batas akhir (hari)</label>
            <input type="number" value={bulkDays} onChange={e => setBulkDays(e.target.value)} min={1} />
          </div>
          <div className="field" style={{ minWidth: 200, flex: 1 }}>
            <label className="fld">Sasaran</label>
            <select value={bulkFilter} onChange={e => setBulkFilter(e.target.value as 'all' | 'screening')}>
              <option value="all">Semua Kandidat (belum selesai)</option>
              <option value="screening">Hanya Screening & Psikotes</option>
            </select>
          </div>
          <button className="btn primary" onClick={openBulk} disabled={sending}>
            {sending ? 'Memproses...' : 'Buka Akses untuk Semua'}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Posisi</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Waktu</th>
              <th>Batas Akhir</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="empty-cell">Belum ada kandidat.</td></tr>
            ) : rows.map(({ c, posName, status }) => (
              <tr key={c.id}>
                <td><b>{c.nama}</b></td>
                <td>{posName}</td>
                <td><span className="chip neutral">{c.stage}</span></td>
                <td><span className={`chip ${statusLabel[status].cls}`}>{statusLabel[status].text}</span></td>
                <td>{c.psikotes_time_limit ? `${c.psikotes_time_limit} menit` : '—'}</td>
                <td>{c.psikotes_close_at ? new Date(c.psikotes_close_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td>
                  {status === 'belum' && (
                    <button className="btn sm primary" onClick={() => openAccess(c)}>Buka</button>
                  )}
                  {status === 'aktif' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm primary" onClick={() => openAccess(c)}>Ulang</button>
                      <button className="btn sm" onClick={() => closeAccessEarly(c)}>Tutup</button>
                    </div>
                  )}
                  {status === 'kadaluarsa' && (
                    <button className="btn sm primary" onClick={() => openAccess(c)}>Buka Ulang</button>
                  )}
                  {status === 'selesai' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="hint" style={{ fontSize: 11, lineHeight: '30px' }}>Selesai</span>
                      <button className="btn sm" onClick={() => closeAccess(c)}>Reset</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
