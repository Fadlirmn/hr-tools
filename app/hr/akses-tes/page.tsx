'use client'

import { useEffect, useState } from 'react'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import type { Candidate } from '@/lib/types'
import { STAGES } from '@/lib/constants'
import { ACCESS_LABEL, accessFields, testStatus, type AccessStatus, type TestType } from '@/lib/test-access'

interface CandidateRow {
  c: Candidate
  posName: string
  discStatus: AccessStatus
  iqStatus: AccessStatus
}

export default function HrPsikotesAksesPage() {
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkTimeLimit, setBulkTimeLimit] = useState('30')
  const [bulkDays, setBulkDays] = useState('3')
  const [bulkFilter, setBulkFilter] = useState<'all' | 'screening'>('all')
  const [bulkType, setBulkType] = useState<TestType>('disc')
  const [sending, setSending] = useState(false)
  // Target pembuka akses per kandidat — form inline pengganti prompt() bawaan browser
  const [accessTarget, setAccessTarget] = useState<{ candidate: Candidate; type: TestType } | null>(null)
  const [accessTimeLimit, setAccessTimeLimit] = useState('30')
  const [accessDays, setAccessDays] = useState('3')

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
        discStatus: testStatus(c, 'disc'),
        iqStatus: testStatus(c, 'iq'),
      }
    })

    setRows(mapped)
    setLoading(false)
  }

  // Dibuka dari Detail Kandidat (?highlight=<id>): sorot & gulir ke baris kandidat
  const [hl, setHl] = useState('')
  useEffect(() => {
    ;(async () => {
      await load()
      const h = new URLSearchParams(window.location.search).get('highlight')
      if (!h) return
      setHl(h)
      setTimeout(() => document.getElementById(`akses-row-${h}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
      setTimeout(() => setHl(cur => (cur === h ? '' : cur)), 4000)
    })()
  }, [])

  const fieldsFor = accessFields

  const openAccessDialog = (candidate: Candidate, type: TestType) => {
    setAccessTimeLimit('30')
    setAccessDays('3')
    setAccessTarget({ candidate, type })
  }

  const confirmAccess = async () => {
    if (!accessTarget) return
    const { candidate, type } = accessTarget
    const timeLimit = Math.max(1, Number(accessTimeLimit) || 30)
    const days = Math.max(1, Number(accessDays) || 3)

    const now = new Date()
    const closeAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: candidate.id,
        ...fieldsFor(type, now.toISOString(), closeAt.toISOString(), timeLimit),
      }),
    })

    try {
      await fetch('/api/notify-psikotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id, type }),
      })
    } catch {}

    setAccessTarget(null)
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

  /** Hapus hasil tes jenis ini + akses-nya, agar kandidat bisa mengerjakan ulang. */
  const resetTest = async (candidate: Candidate, type: TestType) => {
    const label = type === 'disc' ? 'Tes DISC' : 'Tes IQ'
    if (!confirm(`Reset ${label} ${candidate.nama}?\nHasil ${label} akan dihapus dan akses kembali ke "Belum Dibuka".`)) return
    const res = await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: candidate.id,
        psikotes_result: {
          disc: type === 'disc' ? null : candidate.psikotes_result?.disc ?? null,
          iq: type === 'iq' ? null : candidate.psikotes_result?.iq ?? null,
        },
        ...fieldsFor(type, null, null, null),
      }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Gagal reset: ' + (d.error || res.status)); return }
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

  const statusLabel = ACCESS_LABEL

  const actionCell = (candidate: Candidate, type: TestType, status: AccessStatus) => {
    switch (status) {
      case 'belum':
        return <button className="btn sm primary" onClick={() => openAccessDialog(candidate, type)}>Buka</button>
      case 'aktif':
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm primary" onClick={() => openAccessDialog(candidate, type)}>Ulang</button>
            <button className="btn sm" onClick={() => closeAccessEarly(candidate, type)}>Tutup</button>
          </div>
        )
      case 'kadaluarsa':
        return <button className="btn sm primary" onClick={() => openAccessDialog(candidate, type)}>Buka Ulang</button>
      case 'selesai':
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm" onClick={() => resetTest(candidate, type)}>Reset</button>
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
        <table className="tbl tbl-fit access-table">
          <thead>
            <tr>
              <th>Kandidat</th>
              <th>Tes DISC</th>
              <th>Tes IQ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="empty-cell">Belum ada kandidat.</td></tr>
            ) : rows.map(({ c, posName, discStatus, iqStatus }) => (
              <tr key={c.id} id={`akses-row-${c.id}`} className={hl === c.id ? 'row-hl' : undefined}>
                <td className="cell-cand">
                  <b>{c.nama}</b>
                  <div className="hint">{posName} · <span className={`stagepill s-${c.stage}`}>{STAGES[c.stage] || c.stage}</span></div>
                  {!c.user_id && <div className="hint" style={{ color: 'var(--hold)' }} title="Kandidat perlu akun untuk mengerjakan tes online. Kirim undangan dari Daftar Kandidat atau Detail.">Belum punya akun</div>}
                </td>
                {([['disc', discStatus], ['iq', iqStatus]] as const).map(([t, st]) => (
                  <td key={t}>
                    <div className="access-cell">
                      <span className={`chip ${statusLabel[st].cls}`}>{statusLabel[st].text}</span>
                      {actionCell(c, t, st)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {accessTarget && (
        <div className="modal-bg show" onClick={() => setAccessTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Buka Akses {accessTarget.type === 'disc' ? 'Tes DISC' : 'Tes IQ'}</h3>
            <div className="body">
              <div className="field"><label className="fld">Kandidat</label>
                <input type="text" value={accessTarget.candidate.nama} disabled style={{ opacity: 0.6 }} /></div>
              <div className="grid2">
                <div className="field"><label className="fld">Batas waktu (menit)</label>
                  <input type="number" value={accessTimeLimit} onChange={e => setAccessTimeLimit(e.target.value)} min={1} /></div>
                <div className="field"><label className="fld">Batas akhir (hari dari sekarang)</label>
                  <input type="number" value={accessDays} onChange={e => setAccessDays(e.target.value)} min={1} /></div>
              </div>
              <div className="hint">Notifikasi email otomatis dikirim ke kandidat setelah akses dibuka.</div>
            </div>
            <div className="foot">
              <button className="btn" onClick={() => setAccessTarget(null)}>Batal</button>
              <button className="btn primary" onClick={confirmAccess}>Buka Akses</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
