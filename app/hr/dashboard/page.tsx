'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchCandidates } from '@/lib/db-hr'
import type { Candidate, Position } from '@/lib/types'
import { STAGES } from '@/lib/constants'

export default function HrDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])

  const load = async () => {
    const c = await fetchCandidates()
    const { data: p } = await supabase.from('positions').select('*')
    setCandidates(c as Candidate[])
    setPositions((p || []) as Position[])
  }

  useEffect(() => { load() }, [])

  const total = candidates.length
  const cnt = (s: string) => candidates.filter(c => c.stage === s).length
  const active = candidates.filter(c => !['hired', 'rejected'].includes(c.stage)).length

  const order = ['screening', 'psikotes', 'interview', 'offer', 'onboarding', 'hired']

  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'

  return (
    <>
      <div className="stats">
        {[
          ['Total kandidat', total, active + ' aktif'],
          ['Dalam proses', active, ''],
          ['Diterima', cnt('hired'), ''],
          ['Ditolak', cnt('rejected'), ''],
        ].map((s, i) => (
          <div className="stat" key={i}>
            <div className="n">{s[1]}</div>
            <div className="l">{s[0]}</div>
            <div className="bar"><i style={{ width: total ? Math.round(Number(s[1]) / total * 100) + '%' : '0%' }}></i></div>
          </div>
        ))}
      </div>

      <div className="card card-p" style={{ marginBottom: 22 }}>
        <h4 className="blk" style={{ marginTop: 0 }}>Funnel Pipeline</h4>
        {order.map(s => {
          const n = cnt(s)
          const pct = total ? Math.round(n / total * 100) : 0
          return (
            <div className="seg" key={s}>
              <span className="lbl">{STAGES[s]}</span>
              <div className="track"><i style={{ width: pct + '%', background: 'var(--violet)' }}></i></div>
              <span className="pct">{n}</span>
            </div>
          )
        })}
      </div>

      <div className="card card-p">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h4 className="blk" style={{ margin: 0 }}>Kandidat Terbaru</h4>
          <button className="btn ghost sm" onClick={() => router.push('/hr/candidates')}>Lihat semua →</button>
        </div>
        {total === 0 ? (
          <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Belum ada kandidat</div><div className="hint" style={{ marginTop: 4 }}>Klik "Kandidat Baru" untuk mulai.</div></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Nama</th><th>Posisi</th><th>Tahap</th><th>Skor CV</th></tr></thead>
            <tbody>
              {candidates.slice(0, 6).map(c => (
                <tr key={c.id}>
                  <td className="cand-name" onClick={() => router.push(`/hr/candidates?id=${c.id}`)}>{c.nama}</td>
                  <td>{posName(c.posisi)}</td>
                  <td><span className={`stagepill s-${c.stage}`}>{STAGES[c.stage]}</span></td>
                  <td>{c.cv ? <b>{c.cv.percent}%</b> : <span className="hint">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
