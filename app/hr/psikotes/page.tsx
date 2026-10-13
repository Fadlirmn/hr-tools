'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import { loadQuestions } from '@/lib/questions'
import { calcDiscGraphs } from '@/lib/disc-scoring'
import ExamModal, { type ExamTestType, type ExamResult } from '@/components/exam-modal'
import type { Candidate, Position, DiscQuestion, DiscLetter, DiscAnswer, IqQuestion, IqResult } from '@/lib/types'

export default function HrPsikotesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState<string>('')
  const [discAns, setDiscAns] = useState<Record<number, DiscAnswer>>({})
  const [iqAns, setIqAns] = useState<Record<number, number>>({})
  const [examOpen, setExamOpen] = useState<ExamTestType | null>(null)
  const [discQuestions, setDiscQuestions] = useState<DiscQuestion[]>([])
  const [iqQuestions, setIqQuestions] = useState<IqQuestion[]>([])

  const load = async () => {
    const [cands, pos, q] = await Promise.all([
      fetchCandidates(),
      getPositions(),
      loadQuestions(),
    ])
    setCandidates(cands as Candidate[])
    setPositions(pos)
    setDiscQuestions(q.disc)
    setIqQuestions(q.iq)
  }

  useEffect(() => { load() }, [])

  const c = candidates.find(x => x.id === selId) || null

  useEffect(() => {
    setDiscAns(c?.psikotes_result?.disc ? { ...c.psikotes_result.disc.answers } : {})
    setIqAns(c?.psikotes_result?.iq ? { ...c.psikotes_result.iq.answers } : {})
  }, [selId])

  const selectDisc = (qNo: number, letter: DiscLetter, type: 'most' | 'least') => {
    setDiscAns(prev => {
      const current = prev[qNo] || {}
      if (type === 'most' && current.least === letter) { alert('Pilihan Most dan Least tidak boleh sama!'); return prev }
      if (type === 'least' && current.most === letter) { alert('Pilihan Most dan Least tidak boleh sama!'); return prev }
      return { ...prev, [qNo]: { ...current, [type]: letter } as DiscAnswer }
    })
  }
  const setIqFn = (i: number, oi: number) => setIqAns(prev => ({ ...prev, [i]: oi }))

  const discCalc = useMemo(() => calcDiscGraphs(discAns), [discAns])

  const iqCalc = useMemo(() => {
    let correct = 0
    iqQuestions.forEach((q, i) => { if (iqAns[i] === q.a) correct++ })
    const total = iqQuestions.length
    const percent = total ? Math.round((correct / total) * 100) : 0
    const category: IqResult['category'] = percent >= 80 ? 'Tinggi' : percent >= 50 ? 'Rata-rata' : 'Perlu Perhatian'
    return { correct, total, percent, category }
  }, [iqAns, iqQuestions])

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

  const saveFromModal = async (res: ExamResult | null, type: ExamTestType) => {
    if (res) {
      const current = candidates.find(x => x.id === res.candidateId)
      await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: res.candidateId,
          psikotes_result: type === 'disc'
            ? { disc: res, iq: current?.psikotes_result?.iq ?? null }
            : { disc: current?.psikotes_result?.disc ?? null, iq: res },
          stage: 'interview',
        }),
      })
      await load()
    }
    setExamOpen(null)
  }

  const letters: DiscLetter[] = ['a', 'b', 'c', 'd']

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

      {/* Panel DISC */}
      <div className="card card-p" style={{ marginBottom: 16, border: '1.5px solid var(--violet)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <h3 style={{ margin: '0 0 3px' }}>▶ Mode Pengerjaan Kandidat — Tes DISC</h3>
            <div className="hint" style={{ margin: 0 }}>Buka tes layar penuh agar <b>kandidat mengerjakan sendiri</b>.</div>
          </div>
          <button className="btn primary" onClick={() => setExamOpen('disc')}>Mulai Tes DISC</button>
        </div>
      </div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">DISC</span><h3>Tes DISC</h3><span className="meta">{discQuestions.length} soal · Most/Least</span>
        </div>
        {discQuestions.map(q => {
          const ans = discAns[q.no] || {}
          return (
            <div className="q" key={q.no}>
              <div className="qn"><span className="num">{q.no}</span></div>
              {letters.map(letter => {
                const isMost = ans.most === letter
                const isLeast = ans.least === letter
                return (
                  <div key={letter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: 4, borderRadius: 8, background: isMost ? 'var(--line-soft)' : 'transparent' }}>
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

      {/* Panel IQ */}
      <div className="card card-p" style={{ marginTop: 24, marginBottom: 16, border: '1.5px solid var(--violet)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <h3 style={{ margin: '0 0 3px' }}>▶ Mode Pengerjaan Kandidat — Tes IQ</h3>
            <div className="hint" style={{ margin: 0 }}>Buka tes layar penuh agar <b>kandidat mengerjakan sendiri</b>.</div>
          </div>
          <button className="btn primary" onClick={() => setExamOpen('iq')}>Mulai Tes IQ</button>
        </div>
      </div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">IQ</span><h3>Tes IQ</h3><span className="meta">{iqQuestions.length} soal · skor benar/salah</span>
        </div>
        {iqQuestions.map((q, i) => (
          <div className="q" key={i}>
            <div className="qn"><span className="num">{i + 1}</span><span>{q.q}</span></div>
            {q.o.map((o, oi) => (
              <label key={oi} className={`opt ${iqAns[i] === oi ? 'sel' : ''}`} onClick={() => setIqFn(i, oi)}>
                <span className="key">{'ABCD'[oi]}</span><span>{o}</span>
              </label>
            ))}
          </div>
        ))}
        <h4 className="blk" style={{ marginTop: 18 }}>Hasil IQ</h4>
        <div className="seg"><span className="lbl">Skor</span><b>{iqCalc.correct}/{iqCalc.total} ({iqCalc.percent}%)</b></div>
        <div className="seg"><span className="lbl">Kategori</span><b>{iqCalc.category}</b></div>
        {c ? (
          <button className="btn primary no-print" style={{ marginTop: 14 }} onClick={saveIq}>💾 Simpan hasil IQ ke {c.nama}</button>
        ) : (
          <div className="hint" style={{ marginTop: 12 }}>Pilih kandidat untuk menyimpan, atau pakai sebagai uji coba.</div>
        )}
      </div>

      {examOpen && <ExamModal
        mode="hr"
        testType={examOpen}
        candidate={c}
        positions={positions}
        onClose={() => setExamOpen(null)}
        onSave={(res) => saveFromModal(res, examOpen)}
      />}
    </>
  )
}
