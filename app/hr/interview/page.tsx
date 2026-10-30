'use client'

import { useEffect, useState } from 'react'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import type { Candidate, Position, InterviewAssessment } from '@/lib/types'
import { INT_COMP } from '@/lib/constants'

export default function HrInterviewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [by, setBy] = useState('')
  const [rec, setRec] = useState('Lanjut ke offering')
  const [notes, setNotes] = useState('')

  const load = async () => {
    const c = await fetchCandidates()
    setCandidates(c as Candidate[])
    setPositions(await getPositions())
  }

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  const c = candidates.find(x => x.id === selId) || null

  // Reset form saat kandidat terpilih berubah (adjust state during render)
  const [prevSelId, setPrevSelId] = useState(selId)
  if (prevSelId !== selId) {
    setPrevSelId(selId)
    setScores(c?.interview ? { ...c.interview.scores } : {})
    setBy(c?.interview?.by || '')
    setRec(c?.interview?.rec || 'Lanjut ke offering')
    setNotes(c?.interview?.notes || '')
  }

  const setScore = (id: string, n: number) => setScores(prev => ({ ...prev, [id]: n }))

  const calc = () => {
    let sum = 0, filled = 0
    INT_COMP.forEach(cp => { if (scores[cp.id]) { sum += scores[cp.id]; filled++ } })
    const avg = filled ? sum / filled : 0
    const verdict = avg >= 4 ? 'Rekomendasikan' : avg >= 3 ? 'Pertimbangkan' : 'Tidak'
    return { avg, filled, verdict }
  }

  const r = calc()

  const verdictColor = (v: string) => v === 'Rekomendasikan' ? 'var(--ok)' : v === 'Pertimbangkan' ? 'var(--hold)' : 'var(--no)'

  const save = async () => {
    if (!c) return
    const intData: InterviewAssessment = {
      scores: { ...scores }, avg: r.avg, verdict: r.verdict, filled: r.filled,
      by: by.trim(), rec, notes: notes.trim(),
      date: new Date().toISOString().slice(0, 10),
    }
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: c.id,
        interview: intData,
        stage: c.stage === 'interview' ? 'offer' : c.stage,
      }),
    })
    await load()
  }

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
      </div>

      <div className="notice">ℹ️ Nilai tiap kompetensi <b>1–5</b> berdasarkan jawaban & sikap saat wawancara. Skor akhir adalah rata-rata.</div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">Interview</span><h3>Form Penilaian Wawancara</h3>
        </div>

        {INT_COMP.map(cp => {
          const val = scores[cp.id] || 0
          return (
            <div className="crit" key={cp.id}>
              <div className="top">
                <div>
                  <div className="name">{cp.name}</div>
                  <div className="desc">{cp.desc}</div>
                </div>
                <div className="rate">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={val === n ? 'on' : ''} onClick={() => setScore(cp.id, n)}>{n}</button>
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
                  strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - r.avg / 5)} />
              </svg>
              <div className="val"><b>{r.avg.toFixed(1)}</b><span>rata-rata</span></div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <span className={`chip ${verdictColor(r.verdict) === 'var(--ok)' ? 'ok' : verdictColor(r.verdict) === 'var(--hold)' ? 'hold' : 'no'}`}
                style={{ fontSize: 13, padding: '6px 14px' }}>{r.verdict}</span>
              <div className="seg"><span className="lbl">Rata-rata</span><b>{r.avg.toFixed(1)} / 5</b></div>
              <div className="seg"><span className="lbl">Dinilai</span><b>{r.filled}/{INT_COMP.length}</b></div>
            </div>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="field"><label className="fld">Pewawancara</label>
            <input type="text" value={by} onChange={e => setBy(e.target.value)} placeholder="Nama pewawancara" /></div>
          <div className="field"><label className="fld">Rekomendasi tahap selanjutnya</label>
            <select value={rec} onChange={e => setRec(e.target.value)}>
              <option>Lanjut ke offering</option><option>Interview tahap 2</option>
              <option>Tahan / pertimbangkan</option><option>Tidak dilanjutkan</option>
            </select></div>
        </div>

        <div className="field"><label className="fld">Catatan wawancara</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Kesan umum, jawaban menonjol, red flag..."></textarea></div>

        {c ? (
          <button className="btn primary no-print" onClick={save}>💾 Simpan hasil interview</button>
        ) : (
          <div className="hint">Pilih kandidat untuk menyimpan hasil.</div>
        )}
      </div>
    </>
  )
}
