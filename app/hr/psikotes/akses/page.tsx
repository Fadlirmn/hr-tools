'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
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

  const load = async () => {
    setLoading(true)
    const [cRes, pRes] = await Promise.all([
      supabase.from('candidates').select('*').order('tanggal', { ascending: false }),
      supabase.from('positions').select('*'),
    ])
    const candidates = (cRes.data || []) as Candidate[]
    const positions = (pRes.data && pRes.data.length > 0 ? pRes.data : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))) as Position[]

    const now = new Date()
    const mapped: CandidateRow[] = candidates.map(c => {
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

    await supabase.from('candidates').update({
      psikotes_open_at: now.toISOString(),
      psikotes_close_at: closeAt.toISOString(),
      psikotes_time_limit: Number(timeLimit),
    }).eq('id', candidate.id)

    // Notify candidate via API
    try {
      await fetch('/api/notify-psikotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      })
    } catch {}

    await load()
  }

  const closeAccess = async (candidate: Candidate) => {
    await supabase.from('candidates').update({
      psikotes_open_at: null,
      psikotes_close_at: null,
      psikotes_time_limit: null,
    }).eq('id', candidate.id)
    await load()
  }

  const closeAccessEarly = async (candidate: Candidate) => {
    await supabase.from('candidates').update({
      psikotes_close_at: new Date().toISOString(),
    }).eq('id', candidate.id)
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

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Posisi</th>
              <th>Status</th>
              <th>Waktu</th>
              <th>Batas Akhir</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="empty-cell">Belum ada kandidat.</td></tr>
            ) : rows.map(({ c, posName, status }) => (
              <tr key={c.id}>
                <td><b>{c.nama}</b></td>
                <td>{posName}</td>
                <td><span className={`chip ${statusLabel[status].cls}`}>{statusLabel[status].text}</span></td>
                <td>{c.psikotes_time_limit ? `${c.psikotes_time_limit} menit` : '—'}</td>
                <td>{c.psikotes_close_at ? new Date(c.psikotes_close_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td>
                  {status === 'belum' && (
                    <button className="btn sm primary" onClick={() => openAccess(c)}>Buka Akses</button>
                  )}
                  {status === 'aktif' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm primary" onClick={() => openAccess(c)}>Buka Ulang</button>
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
