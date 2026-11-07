'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import { loadQuestions } from '@/lib/questions'
import { calcDiscGraphs } from '@/lib/disc-scoring'
import ExamModal, { type ExamResult } from '@/components/exam-modal'
import CandidatePicker from '@/components/candidate-picker'
import LocalTestTabs from '@/components/local-test-tabs'
import { IconMonitor, IconPlay, IconCheck } from '@/components/icons'
import type { Candidate, Position, DiscQuestion, DiscLetter, DiscAnswer } from '@/lib/types'

export default function HrTesDiscPage() {
  return (
    <Suspense fallback={<div className="hint">Memuat...</div>}>
      <HrTesDiscContent />
    </Suspense>
  )
}

function HrTesDiscContent() {
  const searchParams = useSearchParams()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState<string>(searchParams.get('candidateId') || '')
  const [discAns, setDiscAns] = useState<Record<number, DiscAnswer>>({})
  const [examOpen, setExamOpen] = useState(false)
  const [discQuestions, setDiscQuestions] = useState<DiscQuestion[]>([])

  const load = async () => {
    const [cands, pos, q] = await Promise.all([
      fetchCandidates(),
      getPositions(),
      loadQuestions(),
    ])
    setCandidates(cands as Candidate[])
    setPositions(pos)
    setDiscQuestions(q.disc)
  }

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  const c = candidates.find(x => x.id === selId) || null

  // Sinkron jawaban saat kandidat / data berubah (adjust state during render)
  const [prevKey, setPrevKey] = useState<{ selId: string; candidates: Candidate[] }>({ selId, candidates })
  if (prevKey.selId !== selId || prevKey.candidates !== candidates) {
    setPrevKey({ selId, candidates })
    setDiscAns(c?.psikotes_result?.disc ? { ...c.psikotes_result.disc.answers } : {})
  }

  const selectDisc = (qNo: number, letter: DiscLetter, type: 'most' | 'least') => {
    setDiscAns(prev => {
      const current = prev[qNo] || {}
      if (type === 'most' && current.least === letter) { alert('Pilihan Most dan Least tidak boleh sama!'); return prev }
      if (type === 'least' && current.most === letter) { alert('Pilihan Most dan Least tidak boleh sama!'); return prev }
      return { ...prev, [qNo]: { ...current, [type]: letter } as DiscAnswer }
    })
  }

  const discCalc = useMemo(() => calcDiscGraphs(discAns), [discAns])
  const answered = discQuestions.filter(q => discAns[q.no]?.most && discAns[q.no]?.least).length
  const progressPct = discQuestions.length ? Math.round((answered / discQuestions.length) * 100) : 0

  const saveDisc = async () => {
    if (!c) return
    const result = { answers: { ...discAns }, ...discCalc, date: new Date().toISOString().slice(0, 10), via: 'hr' as const }
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: c.id,
        psikotes_result: { disc: result, iq: c.psikotes_result?.iq ?? null },
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
          psikotes_result: { disc: res, iq: current?.psikotes_result?.iq ?? null },
          stage: 'interview',
        }),
      })
      await load()
    }
    setExamOpen(false)
  }

  const letters: DiscLetter[] = ['a', 'b', 'c', 'd']

  return (
    <>
      <LocalTestTabs active="disc" candidateId={selId} />
      <CandidatePicker value={selId} onChange={setSelId} defaultFilter="todo"
        labels={{ todo: 'Belum tes DISC', done: 'Sudah tes DISC' }}
        items={candidates.map(x => ({
          id: x.id, nama: x.nama, posisi: positions.find(p => p.id === x.posisi)?.name || '—',
          todo: !(!!x.psikotes_result?.disc), done: !!x.psikotes_result?.disc, hasCv: !!x.has_cv_file,
          score: x.psikotes_result?.disc ? `Tipe ${x.psikotes_result.disc.adapted.pattern.type}` : null, scoreKind: 'violet' as const,
        }))}
        extra={<><span>Terjawab {answered}/{discQuestions.length}</span><div className="track" style={{ width: 90 }}><i style={{ width: progressPct + '%', background: 'var(--violet)' }}></i></div><span className="pct">{progressPct}%</span></>} />

      {/* Mode pengerjaan kandidat di PC HRD */}
      <div className="card card-p exam-cta no-print">
        <div style={{ minWidth: 240, flex: 1 }}>
          <h3><IconMonitor size={18} />Kandidat mengerjakan Tes DISC di PC ini</h3>
          <div className="hint" style={{ margin: 0 }}>{c ? <>Tes layar penuh untuk <b>{c.nama}</b>. Serahkan komputer ke kandidat setelah klik mulai.</> : 'Pilih kandidat dulu, atau isi nama kandidat di layar tes.'}</div>
        </div>
        <button className="btn primary" onClick={() => setExamOpen(true)}><IconPlay size={14} />Mulai tes di PC ini</button>
      </div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">DISC</span><h3>Tes DISC</h3><span className="meta">{discQuestions.length} soal · Most/Least</span>
        </div>
        <div className="notice">Untuk setiap soal, pilih satu kata <b>Most (M)</b> — paling menggambarkan diri kandidat — dan satu kata <b>Least (L)</b> — paling tidak menggambarkan. Tidak boleh pilih huruf yang sama untuk M dan L.</div>
        {discQuestions.map(q => {
          const ans = discAns[q.no] || {}
          const done = ans.most && ans.least
          return (
            <div className="q" key={q.no}>
              <div className="qn"><span className="num">{q.no}</span>{done && <span className="hint" style={{ color: 'var(--ok)' }}><IconCheck size={14} title="Terjawab" /></span>}</div>
              {letters.map(letter => {
                const isMost = ans.most === letter
                const isLeast = ans.least === letter
                return (
                  <div key={letter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: 4, borderRadius: 8, background: isMost ? 'var(--violet-soft)' : isLeast ? 'var(--no-bg)' : 'transparent' }}>
                    <span><span className="key" style={{ marginRight: 8 }}>{letter.toUpperCase()}</span>{q.options[letter]}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className={`btn sm ${isMost ? 'primary' : ''}`} onClick={() => selectDisc(q.no, letter, 'most')}>M</button>
                      <button type="button" className={`btn sm ${isLeast ? 'danger' : ''}`} onClick={() => selectDisc(q.no, letter, 'least')}>L</button>
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
        <h4 className="blk" style={{ marginTop: 18 }}>Hasil DISC</h4>
        <div className="grid2" style={{ gap: 16 }}>
          <div>
            <div className="seg"><span className="lbl">Adapted Style</span><b>{discCalc.adapted.pattern.name} ({discCalc.adapted.pattern.type})</b></div>
            {(['D', 'I', 'S', 'C'] as const).map(d => (
              <div className="seg" key={d}>
                <span className="lbl">{d}</span>
                <div className="track"><i style={{ width: discCalc.adapted.scores[d] + '%', background: 'var(--violet)' }}></i></div>
                <span className="pct">{discCalc.adapted.scores[d]}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="seg"><span className="lbl">Natural Style</span><b>{discCalc.natural.pattern.name} ({discCalc.natural.pattern.type})</b></div>
            {(['D', 'I', 'S', 'C'] as const).map(d => (
              <div className="seg" key={d}>
                <span className="lbl">{d}</span>
                <div className="track"><i style={{ width: discCalc.natural.scores[d] + '%', background: 'var(--violet)' }}></i></div>
                <span className="pct">{discCalc.natural.scores[d]}</span>
              </div>
            ))}
          </div>
        </div>
        {c ? (
          <button className="btn primary no-print" style={{ marginTop: 14 }} onClick={saveDisc}>💾 Simpan hasil DISC ke {c.nama}</button>
        ) : (
          <div className="hint" style={{ marginTop: 12 }}>Pilih kandidat untuk menyimpan, atau pakai sebagai uji coba.</div>
        )}
      </div>

      {examOpen && <ExamModal
        mode="hr"
        testType="disc"
        candidate={c}
        positions={positions}
        onClose={() => setExamOpen(false)}
        onSave={saveFromModal}
      />}
    </>
  )
}
