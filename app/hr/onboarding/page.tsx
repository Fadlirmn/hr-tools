'use client'

import { useEffect, useState } from 'react'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import type { Candidate, Position } from '@/lib/types'
import { ONBOARD } from '@/lib/constants'

export default function HrOnboardingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState('')
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  const load = async () => {
    const c = await fetchCandidates()
    setCandidates(c as Candidate[])
    setPositions(await getPositions())
  }

  useEffect(() => { load() }, [])

  const c = candidates.find(x => x.id === selId) || null

  useEffect(() => {
    if (c?.onboarding) {
      setChecklist({ ...c.onboarding.checklist })
    } else {
      setChecklist({})
    }
  }, [selId])

  const toggle = (key: string) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }))

  const save = async () => {
    if (!c) return
    let done = 0, tot = 0
    ONBOARD.forEach((g, gi) => g.items.forEach((_, ii) => { tot++; if (checklist[gi + '-' + ii]) done++ }))
    const progress = tot ? Math.round(done / tot * 100) : 0
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: c.id,
        onboarding: { checklist: { ...checklist }, progress, date: new Date().toISOString().slice(0, 10) },
        stage: progress === 100 ? 'hired' : c.stage === 'offer' ? 'onboarding' : c.stage,
      }),
    })
    await load()
  }

  if (!c) {
    return (
      <div className="selectbar no-print">
        <label className="fld" style={{ margin: 0 }}>Kandidat</label>
        <select value={selId} onChange={e => setSelId(e.target.value)}>
          <option value="">— Pilih kandidat —</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.nama} · {(positions.find(p => p.id === c.posisi)?.name || '—')}</option>
          ))}
        </select>
        <span className="hint">Onboarding dijalankan untuk karyawan yang sudah diterima.</span>
      </div>
    )
  }

  let done = 0, tot = 0

  return (
    <>
      <div className="selectbar no-print">
        <label className="fld" style={{ margin: 0 }}>Kandidat</label>
        <select value={selId} onChange={e => setSelId(e.target.value)}>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.nama} · {(positions.find(p => p.id === c.posisi)?.name || '—')}</option>
          ))}
        </select>
      </div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">Onboarding</span><h3>Checklist Karyawan Baru — {c.nama}</h3>
        </div>

        {ONBOARD.map((grp, gi) => (
          <div key={gi}>
            <h4 className="blk">{grp.g}</h4>
            {grp.items.map((it, ii) => {
              const key = gi + '-' + ii
              const on = !!checklist[key]
              tot++; if (on) done++
              return (
                <div key={key} className={`checkitem ${on ? 'done' : ''}`} onClick={() => toggle(key)}>
                  <div className="cbox">{on ? '✓' : ''}</div>
                  <span className="ct">{it}</span>
                </div>
              )
            })}
          </div>
        ))}

        {(() => {
          const pct = tot ? Math.round(done / tot * 100) : 0
          return (
            <>
              <div className="seg" style={{ marginTop: 18 }}>
                <span className="lbl">Progress onboarding</span>
                <div className="track"><i style={{ width: pct + '%', background: 'var(--ok)' }}></i></div>
                <span className="pct">{pct}%</span>
              </div>
              <button className="btn primary no-print" style={{ marginTop: 14 }} onClick={save}>💾 Simpan progress</button>
            </>
          )
        })()}
      </div>
    </>
  )
}
