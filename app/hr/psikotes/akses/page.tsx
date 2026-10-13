'use client'

import { useEffect, useState } from 'react'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import type { Candidate, Position } from '@/lib/types'

type AccessStatus = 'belum' | 'aktif' | 'kadaluarsa' | 'selesai'
type TestType = 'disc' | 'iq'

interface CandidateRow {
  c: Candidate
  posName: string
  discStatus: AccessStatus
  iqStatus: AccessStatus
}

function computeStatus(hasResult: boolean, openAt: string | null, closeAt: string | null): AccessStatus {
  const now = new Date()
  if (hasResult) return 'selesai'
  if (!openAt || !closeAt) return 'belum'
  return new Date(closeAt) < now ? 'kadaluarsa' : 'aktif'
}

export default function HrPsikotesAksesPage() {
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkTimeLimit, setBulkTimeLimit] = useState('30')
  const [bulkDays, setBulkDays] = useState('3')
  const [bulkFilter, setBulkFilter] = useState<'all' | 'screening'>('all')
  const [bulkType, setBulkType] = useState<TestType>('disc')
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    const [candidates, positions] = await Promise.all([
      fetchCandidates(),
      getPositions(),
    ])

    const mapped: CandidateRow[] = (candidates as Candidate[]).map(c => {
      const posName = positions.find(p => p.id === c.posisi)?.name || '—'
      return {
        c,
        posName,
        discStatus: computeStatus(!!c.psikotes_result?.disc, c.disc_open_at, c.disc_close_at),
        iqStatus: computeStatus(!!c.psikotes_result?.iq, c.iq_open_at, c.iq_close_at),
      }
    })

    setRows(mapped)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const fieldsFor = (type: TestType, openAt: string | null, closeAt: string | null, timeLimit: number | null) =>
    type === 'disc'
      ? { disc_open_at: openAt, disc_close_at: closeAt, disc_time_limit: timeLimit }
      : { iq_open_at: openAt, iq_close_at: closeAt, iq_time_limit: timeLimit }

  const openAccess = async (candidate: Candidate, type: TestType) => {
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
        ...fieldsFor(type, now.toISOString(), closeAt.toISOString(), Number(timeLimit)),
      }),
    })

    try {
      await fetch('/api/notify-psikotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id, type }),
      })
    } catch {}

    await load()
  }

  const openBulk = async () => {
    const eligible = rows.filter(({ c, discStatus, iqStatus }) => {
      const status = bulkType === 'disc' ? discStatus : iqStatus
      if (status === 'selesai' || status === 'aktif') return false
      if (bulkFilter === 'screening' && c.stage !== 'screening' && c.stage !== 'psikotes') return false
      return true
    })

    if (eligible.length === 0) {
      alert('Tidak ada kandidat yang memenuhi kriteria.')
      return
    }

    const filterLabel = bulkFilter === 'all' ? 'SEMUA KANDIDAT' : 'KANDIDAT Screening / Psikotes'
    const testLabel = bulkType === 'disc' ? 'Tes DISC' : 'Tes IQ'
    if (!confirm(`Buka akses ${testLabel} untuk ${eligible.length} kandidat (${filterLabel})?\n\nWaktu: ${bulkTimeLimit} menit\nBatas akhir: ${bulkDays} hari`)) return

    setSending(true)
    const now = new Date()
    const closeAt = new Date(now.getTime() + Number(bulkDays) * 24 * 60 * 60 * 1000)
    const ids = eligible.map(r => r.c.id)

    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: ids[0],
        _bulk: {
          ids,
          ...fieldsFor(bulkType, now.toISOString(), closeAt.toISOString(), Number(bulkTimeLimit)),
        },
      }),
    })

    for (const r of eligible) {
      if (r.c.email) {
        try {
          await fetch('/api/notify-psikotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId: r.c.id, type: bulkType }),
          })
        } catch {}
      }
    }

    setSending(false)
    await load()
  }

  const closeAccess = async (candidate: Candidate, type: TestType) => {
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: candidate.id, ...fieldsFor(type, null, null, null) }),
    })
    await load()
  }

  const closeAccessEarly = async (candidate: Candidate, type: TestType) => {
    const field = type === 'disc' ? 'disc_close_at' : 'iq_close_at'
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: candidate.id, [field]: new Date().toISOString() }),
    })
    await load()
  }

  const statusLabel: Record<AccessStatus, { text: string; cls: string }> = {
    belum: { text: 'Belum Dibuka', cls: 'neutral' },
    aktif: { text: 'Aktif', cls: 'ok' },
    kadaluarsa: { text: 'Kadaluarsa', cls: 'no' },
    selesai: { text: 'Selesai', cls: 'hold' },
  }

  const actionCell = (candidate: Candidate, type: TestType, status: AccessStatus) => {
    switch (status) {
      case 'belum':
        return <button className="btn sm primary" onClick={() => openAccess(candidate, type)}>Buka</button>
      case 'aktif':
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm primary" onClick={() => openAccess(candidate, type)}>Ulang</button>
            <button className="btn sm" onClick={() => closeAccessEarly(candidate, type)}>Tutup</button>
          </div>
        )
      case 'kadaluarsa':
        return <button className="btn sm primary" onClick={() => openAccess(candidate, type)}>Buka Ulang</button>
      case 'selesai':
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="hint" style={{ fontSize: 11, lineHeight: '30px' }}>Selesai</span>
            <button className="btn sm" onClick={() => closeAccess(candidate, type)}>Reset</button>
          </div>
        )
    }
  }

  if (loading) return <div className="hint">Memuat...</div>

  return (
    <>
      <div className="notice">
        Kelola akses Tes DISC dan Tes IQ secara independen. Status <b>Aktif</b> berarti kandidat dapat mengerjakan tes dari portal mereka dalam batas waktu yang ditentukan.
      </div>

      <div className="card card-p" style={{ marginBottom: 16, border: '1.5px solid var(--violet)' }}>
        <h4 className="blk" style={{ marginTop: 0 }}>Buka Akses untuk Semua</h4>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ minWidth: 140, flex: 1 }}>
            <label className="fld">Jenis Tes</label>
            <select value={bulkType} onChange={e => setBulkType(e.target.value as TestType)}>
              <option value="disc">Tes DISC</option>
              <option value="iq">Tes IQ</option>
            </select>
          </div>
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
              <th>Status DISC</th>
              <th>Aksi DISC</th>
              <th>Status IQ</th>
              <th>Aksi IQ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="empty-cell">Belum ada kandidat.</td></tr>
            ) : rows.map(({ c, posName, discStatus, iqStatus }) => (
              <tr key={c.id}>
                <td><b>{c.nama}</b></td>
                <td>{posName}</td>
                <td><span className="chip neutral">{c.stage}</span></td>
                <td><span className={`chip ${statusLabel[discStatus].cls}`}>{statusLabel[discStatus].text}</span></td>
                <td>{actionCell(c, 'disc', discStatus)}</td>
                <td><span className={`chip ${statusLabel[iqStatus].cls}`}>{statusLabel[iqStatus].text}</span></td>
                <td>{actionCell(c, 'iq', iqStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
