'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchCandidates } from '@/lib/db-hr'
import type { Candidate, Position, CvScores, CvAssessment } from '@/lib/types'
import { CV_CRITERIA, POSITIONS_DEFAULT } from '@/lib/constants'

export default function HrCvPage() {
  return (
    <Suspense fallback={<div className="hint">Memuat...</div>}>
      <HrCvContent />
    </Suspense>
  )
}

function HrCvContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState<string>(searchParams.get('candidateId') || '')
  const [scores, setScores] = useState<CvScores>({})
  const [notes, setNotes] = useState('')

  const load = async () => {
    const c = await fetchCandidates()
    const { data: p } = await supabase.from('positions').select('*')
    setCandidates(c as Candidate[])
    setPositions((p && p.length > 0 ? p : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))) as Position[])
  }

  useEffect(() => { load() }, [])

  const c = candidates.find(x => x.id === selId) || null
  const pos = c ? positions.find(p => p.id === c.posisi) : null
  const weights = (pos ? pos.weights : Object.fromEntries(CV_CRITERIA.map(x => [x.id, 2]))) as Record<string, number>

  useEffect(() => {
    if (c?.cv) {
      setScores({ ...c.cv.scores })
      setNotes(c.cv.notes || '')
    } else {
      setScores({})
      setNotes('')
    }
  }, [selId])

  const setCV = (id: string, n: number) => {
    setScores(prev => ({ ...prev, [id]: n }))
  }

  const calc = useCallback(() => {
    let got = 0, max = 0, filled = 0
    CV_CRITERIA.forEach(cr => {
      const w = weights[cr.id] || 1
      max += 5 * w
      if (scores[cr.id]) { got += scores[cr.id] * w; filled++ }
    })
    const percent = max ? Math.round(got / max * 100) : 0
    const verdict = percent >= 75 ? 'Lolos' : percent >= 60 ? 'Pertimbangkan' : 'Tidak Lolos'
    return { got, max, percent, verdict, filled }
  }, [scores, weights])

  const r = calc()

  const save = async () => {
    if (!c) return
    if (r.filled < CV_CRITERIA.length && !confirm('Belum semua kriteria dinilai. Tetap simpan?')) return
    const cvData: CvAssessment = {
      scores: { ...scores }, got: r.got, max: r.max, percent: r.percent,
      verdict: r.verdict, filled: r.filled, notes: notes.trim(),
      date: new Date().toISOString().slice(0, 10),
    }
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: c.id,
        cv: cvData,
        stage: c.stage === 'screening' ? 'psikotes' : c.stage,
      }),
    })
    await load()
  }

  const verdictColor = (v: string) => ['Lolos', 'Rekomendasikan'].includes(v) ? 'var(--ok)' : v === 'Pertimbangkan' ? 'var(--hold)' : 'var(--no)'

  return (
    <>
      <div className="selectbar no-print">
        <label className="fld" style={{ margin: 0 }}>Kandidat</label>
        <select value={selId} onChange={e => setSelId(e.target.value)}>
          <option value="">— Pilih kandidat —</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.nama} · {(positions.find(p => p.id === c.posisi)?.name || '—')}</option>
          ))}
        </select>
        <span className="hint">Pilih kandidat untuk menyimpan hasil ke profilnya.</span>
      </div>

      <div className="notice">ℹ️ Tiap kriteria dinilai <b>1–5</b>. Bobot tiap kriteria mengikuti posisi yang dilamar (atur di menu "Posisi & Bobot"). Skor akhir adalah persentase tertimbang.</div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">CV</span><h3>Form Penilaian CV / Resume</h3>
          <span className="meta">{pos ? pos.name : 'posisi umum'}</span>
        </div>

        {CV_CRITERIA.map(cr => {
          const w = weights[cr.id] || 1
          const val = scores[cr.id] || 0
          return (
            <div className="crit" key={cr.id}>
              <div className="top">
                <div>
                  <div className="name">{cr.name} <span className="w">bobot {w}</span></div>
                  <div className="desc">{cr.desc}</div>
                </div>
                <div className="rate">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={val === n ? 'on' : ''} onClick={() => setCV(cr.id, n)}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
          <div className="scorecard">
            <div className="gauge">
              <svg width="128" height="128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                <circle cx="64" cy="64" r="54" fill="none" stroke={verdictColor(r.verdict)} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - r.percent / 100)} />
              </svg>
              <div className="val"><b>{r.percent}%</b><span>dari maksimal</span></div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <span className={`chip ${verdictColor(r.verdict) === 'var(--ok)' ? 'ok' : verdictColor(r.verdict) === 'var(--hold)' ? 'hold' : 'no'}`} style={{ fontSize: 13, padding: '6px 14px' }}>{r.verdict}</span>
              <div className="seg"><span className="lbl">Skor tertimbang</span><b>{r.got} / {r.max}</b></div>
              <div className="seg"><span className="lbl">Kriteria dinilai</span><b>{r.filled}/{CV_CRITERIA.length}</b></div>
            </div>
          </div>
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <label className="fld">Catatan penilai</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Kekuatan, kelemahan, hal yang perlu digali saat interview..."></textarea>
        </div>

        {c ? (
          <button className="btn primary no-print" onClick={save}>💾 Simpan hasil CV</button>
        ) : (
          <div className="hint">Pilih kandidat di atas untuk menyimpan hasil.</div>
        )}
      </div>
    </>
  )
}
