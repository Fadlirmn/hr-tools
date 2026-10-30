'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import { loadQuestions } from '@/lib/questions'
import ExamModal, { type ExamResult } from '@/components/exam-modal'
import { calcIq, estimateIq, classifyIq, IQ_CATEGORIES } from '@/lib/iq-scoring'
import type { Candidate, Position, IqQuestion } from '@/lib/types'

export default function HrTesIqPage() {
  return (
    <Suspense fallback={<div className="hint">Memuat...</div>}>
      <HrTesIqContent />
    </Suspense>
  )
}

function HrTesIqContent() {
  const searchParams = useSearchParams()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState<string>(searchParams.get('candidateId') || '')
  const [iqAns, setIqAns] = useState<Record<number, number>>({})
  const [examOpen, setExamOpen] = useState(false)
  const [iqQuestions, setIqQuestions] = useState<IqQuestion[]>([])
  const [secIdx, setSecIdx] = useState(0)

  const load = async () => {
    const [cands, pos, q] = await Promise.all([
      fetchCandidates(),
      getPositions(),
      loadQuestions(),
    ])
    setCandidates(cands as Candidate[])
    setPositions(pos)
    setIqQuestions(q.iq)
  }

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  const c = candidates.find(x => x.id === selId) || null

  // Sinkron jawaban saat kandidat / data berubah (adjust state during render)
  const [prevKey, setPrevKey] = useState<{ selId: string; candidates: Candidate[] }>({ selId, candidates })
  if (prevKey.selId !== selId || prevKey.candidates !== candidates) {
    setPrevKey({ selId, candidates })
    setIqAns(c?.psikotes_result?.iq ? { ...c.psikotes_result.iq.answers } : {})
  }

  const setIqFn = (i: number, oi: number) => setIqAns(prev => ({ ...prev, [i]: oi }))

  const iqCalc = useMemo(() => calcIq(iqAns, iqQuestions), [iqAns, iqQuestions])
  const iqScore = estimateIq(iqCalc.percent)

  const answered = Object.keys(iqAns).length
  const totalPct = iqCalc.total ? Math.round((answered / iqCalc.total) * 100) : 0

  const saveIq = async () => {
    if (!c) return
    const result = { answers: { ...iqAns }, ...iqCalc, date: new Date().toISOString().slice(0, 10), via: 'hr' as const }
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: c.id,
        psikotes_result: { disc: c.psikotes_result?.disc ?? null, iq: result },
        stage: (c.stage === 'screening' || c.stage === 'psikotes') ? 'interview' : c.stage,
      }),
    })
    await load()
  }

  const saveFromModal = async (res: ExamResult | null) => {
    if (res) {
      const current = candidates.find(x => x.id === res.candidateId)
      await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: res.candidateId,
          psikotes_result: { disc: current?.psikotes_result?.disc ?? null, iq: res },
          stage: 'interview',
        }),
      })
      await load()
    }
    setExamOpen(false)
  }

  const category = IQ_CATEGORIES[secIdx]
  const inSec = iqQuestions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => q.sec === category)
  const secAnswered = inSec.filter(({ idx }) => iqAns[idx] != null).length

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
        <span className="hint">Terjawab {answered}/{iqCalc.total}</span>
        <div className="track" style={{ flex: 1, minWidth: 120 }}><i style={{ width: totalPct + '%', background: 'var(--violet)' }}></i></div>
        <span className="pct">{totalPct}%</span>
      </div>

      {/* Mode pengerjaan kandidat */}
      <div className="card card-p" style={{ marginBottom: 16, border: '1.5px solid var(--violet)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <h3 style={{ margin: '0 0 3px' }}>▶ Mode Pengerjaan Kandidat — Tes IQ</h3>
            <div className="hint" style={{ margin: 0 }}>Buka tes layar penuh agar <b>kandidat mengerjakan sendiri</b>.</div>
          </div>
          <button className="btn primary" onClick={() => setExamOpen(true)}>Mulai Tes IQ</button>
        </div>
      </div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">IQ</span><h3>Tes IQ</h3><span className="meta">{iqQuestions.length} soal · skor benar/salah</span>
        </div>
        <div className="notice">Pilih satu jawaban yang paling tepat. Kerjakan per bagian — progres tersimpan otomatis di halaman ini sampai Anda menekan Simpan.</div>

        {/* Navigasi bagian */}
        <div className="likert no-print" style={{ marginBottom: 16 }}>
          {IQ_CATEGORIES.map((cat, i) => {
            const count = iqQuestions.filter(q => q.sec === cat).length
            const done = iqQuestions
              .map((q, idx) => ({ q, idx }))
              .filter(({ q }) => q.sec === cat)
              .filter(({ idx }) => iqAns[idx] != null).length
            return (
              <button key={cat} className={i === secIdx ? 'on' : ''} onClick={() => setSecIdx(i)}>
                {cat} · {done}/{count}
              </button>
            )
          })}
        </div>

        <h4 className="blk" style={{ marginTop: 0 }}>{category} <span className="hint">({secAnswered}/{inSec.length} terjawab)</span></h4>
        {inSec.map(({ q, idx }) => (
          <div className="q" key={idx}>
            <div className="qn"><span className="num">{idx + 1}</span><span>{q.q}</span></div>
            {q.o.map((o, oi) => (
              <label key={oi} className={`opt ${iqAns[idx] === oi ? 'sel' : ''}`} onClick={() => setIqFn(idx, oi)}>
                <span className="key">{'ABCD'[oi]}</span><span>{o}</span>
              </label>
            ))}
          </div>
        ))}

        <div className="exam-nav no-print">
          {secIdx > 0
            ? <button className="btn" onClick={() => setSecIdx(secIdx - 1)}>← Sebelumnya</button>
            : <span></span>}
          {secIdx < IQ_CATEGORIES.length - 1
            ? <button className="btn primary" onClick={() => setSecIdx(secIdx + 1)}>Lanjut →</button>
            : <span></span>}
        </div>

        <h4 className="blk" style={{ marginTop: 18 }}>Hasil IQ</h4>
        <div className="seg"><span className="lbl">Skor</span><b>{iqCalc.correct}/{iqCalc.total} ({iqCalc.percent}%)</b></div>
        <div className="seg"><span className="lbl">Kategori</span><b>{iqCalc.category}</b></div>
        <div className="seg"><span className="lbl">Perkiraan IQ</span><b>{iqScore}</b></div>
        <div className="seg"><span className="lbl">Klasifikasi</span><b>{classifyIq(iqScore).label}</b></div>
        {c ? (
          <button className="btn primary no-print" style={{ marginTop: 14 }} onClick={saveIq}>💾 Simpan hasil IQ ke {c.nama}</button>
        ) : (
          <div className="hint" style={{ marginTop: 12 }}>Pilih kandidat untuk menyimpan, atau pakai sebagai uji coba.</div>
        )}
      </div>

      {examOpen && <ExamModal
        mode="hr"
        testType="iq"
        candidate={c}
        positions={positions}
        onClose={() => setExamOpen(false)}
        onSave={saveFromModal}
      />}
    </>
  )
}
