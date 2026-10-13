'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { loadQuestions } from '@/lib/questions'
import { calcDiscGraphs } from '@/lib/disc-scoring'
import type { Candidate, Position, DiscQuestion, DiscLetter, IqQuestion, DiscAnswer, DiscResult, IqResult, IqCategory } from '@/lib/types'

export type ExamTestType = 'disc' | 'iq'
export type ExamResult = (DiscResult | IqResult) & { candidateId?: string | null }

interface ExamModalProps {
  mode: 'hr' | 'candidate'
  testType: ExamTestType
  candidate: Candidate | null
  positionName?: string
  positions?: Position[]
  timeLimit?: number | null
  onClose: () => void
  onSave: (res: ExamResult | null) => Promise<void>
}

const IQ_CATEGORIES: IqCategory[] = ['Logika', 'Numerik', 'Verbal', 'Spasial']

function calcIq(ans: Record<number, number>, questions: IqQuestion[]) {
  let correct = 0
  questions.forEach((q, i) => { if (ans[i] === q.a) correct++ })
  const total = questions.length
  const percent = total ? Math.round((correct / total) * 100) : 0
  const category: IqResult['category'] = percent >= 80 ? 'Tinggi' : percent >= 50 ? 'Rata-rata' : 'Perlu Perhatian'
  return { correct, total, percent, category }
}

export default function ExamModal({ mode, testType, candidate, positions, timeLimit, onClose, onSave }: ExamModalProps) {
  const [discQuestions, setDiscQuestions] = useState<DiscQuestion[]>([])
  const [iqQuestions, setIqQuestions] = useState<IqQuestion[]>([])
  const [screen, setScreen] = useState<'intro' | 'test' | 'done'>(mode === 'candidate' ? 'test' : 'intro')
  const [secIdx, setSecIdx] = useState(0) // dipakai IQ untuk navigasi kategori
  const [discAns, setDiscAns] = useState<Record<number, DiscAnswer>>({})
  const [iqAns, setIqAns] = useState<Record<number, number>>({})
  const [name, setName] = useState(candidate?.nama || '')
  const [posId, setPosId] = useState(candidate?.posisi || (positions && positions[0]?.id) || '')
  const [timeLeft, setTimeLeft] = useState((timeLimit || 30) * 60)
  const [timerActive, setTimerActive] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadQuestions().then(q => {
      setDiscQuestions(q.disc)
      setIqQuestions(q.iq)
      setLoaded(true)
      if (mode === 'candidate') setTimerActive(true)
    })
  }, [])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  useEffect(() => {
    if (!timerActive || screen !== 'test') return
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearTimer(); return 0 }
        return prev - 1
      })
    }, 1000)
    return clearTimer
  }, [timerActive, screen, clearTimer])

  const title = testType === 'disc' ? 'Tes DISC' : 'Tes IQ'

  const startTest = () => {
    if (mode === 'hr' && !candidate && !name.trim()) { alert('Isi nama kandidat dulu'); return }
    setScreen('test')
    setTimerActive(true)
  }

  const selectDisc = (qNo: number, letter: DiscLetter, type: 'most' | 'least') => {
    setDiscAns(prev => {
      const current = prev[qNo] || {}
      if (type === 'most' && current.least === letter) { alert('Pilihan Most dan Least tidak boleh sama!'); return prev }
      if (type === 'least' && current.most === letter) { alert('Pilihan Most dan Least tidak boleh sama!'); return prev }
      return { ...prev, [qNo]: { ...current, [type]: letter } as DiscAnswer }
    })
  }
  const setIq = (i: number, oi: number) => setIqAns(prev => ({ ...prev, [i]: oi }))

  const discAnsweredCount = discQuestions.filter(q => discAns[q.no]?.most && discAns[q.no]?.least).length
  const iqAnsweredCount = Object.keys(iqAns).length

  const handleSubmit = useCallback(async (auto: boolean) => {
    const totalQ = testType === 'disc' ? discQuestions.length : iqQuestions.length
    const totalAns = testType === 'disc' ? discAnsweredCount : iqAnsweredCount
    if (!auto && totalAns < totalQ) {
      if (!confirm(`Masih ada ${totalQ - totalAns} soal belum dijawab. Tetap kumpulkan?`)) return
    }

    setTimerActive(false)
    clearTimer()

    if (mode === 'candidate' && candidate) {
      const body = testType === 'disc'
        ? { type: 'disc', candidateId: candidate.id, answers: discAns }
        : { type: 'iq', candidateId: candidate.id, answers: iqAns }
      const res = await fetch('/api/exam-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setScreen('done')
      await onSave(data.result ?? null)
      return
    }

    // HR mode: compute score locally (full data tersedia untuk HR)
    let result: Omit<DiscResult, 'date' | 'via'> | Omit<IqResult, 'date' | 'via'>
    if (testType === 'disc') {
      const { adapted, natural } = calcDiscGraphs(discAns)
      result = { answers: { ...discAns }, adapted, natural }
    } else {
      const { correct, total, percent, category } = calcIq(iqAns, iqQuestions)
      result = { answers: { ...iqAns }, correct, total, percent, category }
    }
    const finalResult = { ...result, date: new Date().toISOString().slice(0, 10), via: 'hr' as const }

    let candidateId: string | undefined
    if (mode === 'hr' && !candidate && name.trim()) {
      const { v4: uuidv4 } = await import('uuid')
      const newId = uuidv4()
      const psikotesResultPatch = testType === 'disc'
        ? { disc: finalResult, iq: null }
        : { disc: null, iq: finalResult }
      const newC = {
        id: newId, user_id: null, nama: name.trim(), posisi: posId,
        sumber: '—', email: '', telepon: '', catatan: '',
        stage: 'interview', tanggal: new Date().toISOString().slice(0, 10),
        invite_token: null, cv: null, psikotes_result: psikotesResultPatch, interview: null, onboarding: null,
      }
      await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newC),
      })
      candidateId = newId
    }
    setScreen('done')
    await onSave({ ...finalResult, candidateId })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discAns, iqAns, mode, candidate, name, posId, testType, discQuestions, iqQuestions, onSave, clearTimer])

  useEffect(() => {
    if (timeLeft === 0 && screen === 'test') handleSubmit(true)
  }, [timeLeft, handleSubmit, screen])

  if (!loaded) return null

  const doneScreen = () => {
    if (mode === 'candidate') {
      return (
        <div className="login-bg">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="logo" style={{ justifyContent: 'center' }}>
              <div className="mark" style={{ background: 'var(--ok)' }}>✓</div>
              <h1>Tes Selesai!</h1>
            </div>
            <p style={{ color: 'var(--ink-soft)', margin: '16px 0 24px' }}>Jawaban {title} sudah terkumpul. Lihat hasilnya di dashboard.</p>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>Ke Dashboard</button>
          </div>
        </div>
      )
    }
    return (
      <div className="exam-bg show">
        <div className="exam-top">
          <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>{title} Kandidat</span></div>
          <button className="btn sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none' }} onClick={onClose}>Tutup</button>
        </div>
        <div className="exam-wrap">
          <div className="exam-card exam-done">
            <div className="big">✓</div>
            <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>Terima kasih, {title} selesai!</h2>
            <p style={{ color: 'var(--ink-soft)', maxWidth: 430, margin: '0 auto 22px' }}>Jawaban sudah terkumpul.</p>
            <button className="btn primary" onClick={onClose}>Selesai</button>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'done') return doneScreen()

  const m = Math.floor(timeLeft / 60), s = timeLeft % 60
  const letters: DiscLetter[] = ['a', 'b', 'c', 'd']

  const renderDisc = () => (
    <>
      <div className="exam-sec-h">{title}</div>
      <div className="exam-sec-d">Untuk setiap soal, pilih satu kata <b>Most (M)</b> — paling menggambarkan diri Anda — dan satu kata <b>Least (L)</b> — paling tidak menggambarkan diri Anda. Tidak boleh pilih huruf yang sama untuk M dan L.</div>
      {discQuestions.map(q => {
        const ans = discAns[q.no] || {}
        return (
          <div className="exam-q" key={q.no}>
            <div className="qtext"><span className="n">{q.no}</span></div>
            {letters.map(letter => {
              const isMost = ans.most === letter
              const isLeast = ans.least === letter
              return (
                <div key={letter} className={`exam-opt ${isMost ? 'sel' : ''} ${isLeast ? 'least' : ''}`} style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                  <span><span className="k">{letter.toUpperCase()}</span>{q.options[letter]}</span>
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
    </>
  )

  const iqCategory = IQ_CATEGORIES[secIdx]
  const iqInSec = iqQuestions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => q.sec === iqCategory)
  const iqSecAnswered = iqInSec.filter(({ idx }) => iqAns[idx] != null).length

  const renderIq = () => (
    <>
      <div className="exam-sec-h">{title} · {iqCategory}</div>
      <div className="exam-sec-d">Pilih satu jawaban yang paling tepat.</div>
      {iqInSec.map(({ q, idx }) => (
        <div className="exam-q" key={idx}>
          <div className="qtext"><span className="n">{idx + 1}</span><span>{q.q}</span></div>
          {q.o.map((o, oi) => (
            <div key={oi} className={`exam-opt ${iqAns[idx] === oi ? 'sel' : ''}`} onClick={() => setIq(idx, oi)}>
              <span className="k">{'ABCD'[oi]}</span><span>{o}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )

  const progressLabel = testType === 'disc'
    ? `Terjawab ${discAnsweredCount}/${discQuestions.length}`
    : `Terjawab ${iqSecAnswered}/${iqInSec.length} (bagian ini)`

  const progressPct = testType === 'disc'
    ? (discQuestions.length ? Math.round((discAnsweredCount / discQuestions.length) * 100) : 0)
    : Math.round(((secIdx + 1) / IQ_CATEGORIES.length) * 100)

  const body = testType === 'disc' ? renderDisc() : renderIq()

  const isLastSec = testType === 'iq' ? secIdx === IQ_CATEGORIES.length - 1 : true

  const navButtons = (
    <div className="exam-nav">
      {testType === 'iq' && secIdx > 0 ? (
        <button className="btn" onClick={() => setSecIdx(secIdx - 1)}>← Sebelumnya</button>
      ) : <span></span>}
      {testType === 'iq' && !isLastSec ? (
        <button className="btn primary" onClick={() => setSecIdx(secIdx + 1)}>Lanjut →</button>
      ) : (
        <button className="btn primary" onClick={() => handleSubmit(false)}>✓ Kumpulkan Jawaban</button>
      )}
    </div>
  )

  if (mode === 'candidate') {
    return (
      <>
        <div className="exam-top" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>{title} Kandidat</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {timeLimit != null && (
              <span className={`exam-timer ${timeLeft <= 120 ? 'warn' : ''}`}>
                {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
        <div style={{ marginTop: 64 }}>
          <div className="exam-prog" style={{ paddingTop: 16 }}>
            <span className="lbl">{testType === 'iq' ? `Bagian ${secIdx + 1} dari ${IQ_CATEGORIES.length}` : title}</span>
            <div className="bar"><i style={{ width: progressPct + '%' }}></i></div>
            <span className="lbl">{progressLabel}</span>
          </div>
          <div className="exam-card" style={{ margin: '0 auto', maxWidth: 800 }}>
            {body}
          </div>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 0' }}>{navButtons}</div>
        </div>
      </>
    )
  }

  return (
    <div className="exam-bg show">
      <div className="exam-top">
        <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>{title} Kandidat</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {timeLimit != null && (
            <span className={`exam-timer ${timeLeft <= 120 ? 'warn' : ''}`} style={{ display: screen === 'test' ? '' : 'none' }}>
              {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </span>
          )}
          <button className="btn sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none' }} onClick={onClose}>Tutup</button>
        </div>
      </div>
      <div className="exam-wrap">
        {screen === 'intro' ? (
          <div className="exam-card exam-intro">
            <h2>{title} Kandidat</h2>
            <div className="sub">Mohon dikerjakan sendiri, jujur, dan tanpa bantuan pihak lain.</div>
            {!candidate ? (
              <>
                <div className="field" style={{ marginTop: 14 }}><label className="fld">Nama lengkap</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nama kandidat" /></div>
                <div className="field" style={{ marginTop: 10 }}><label className="fld">Posisi dilamar</label>
                  <select value={posId} onChange={e => setPosId(e.target.value)}>
                    {positions?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
              </>
            ) : (
              <div className="exam-rules" style={{ background: 'var(--line-soft)' }}><b>{candidate.nama}</b></div>
            )}
            <div className="exam-rules">
              <b>Petunjuk pengerjaan:</b>
              {testType === 'disc' ? (
                <ul>
                  <li>Tes terdiri dari <b>{discQuestions.length} soal</b>, masing-masing 4 pilihan kata.</li>
                  <li>Tiap soal: pilih 1 kata <b>Most (M)</b> dan 1 kata <b>Least (L)</b> — tidak boleh sama.</li>
                  <li>Total waktu <b>{timeLimit || 30} menit</b>; timer berjalan otomatis setelah menekan &quot;Mulai Tes&quot;.</li>
                  <li>Tidak ada jawaban benar/salah pada tes ini.</li>
                </ul>
              ) : (
                <ul>
                  <li>Tes terdiri dari <b>{iqQuestions.length} soal</b> dalam {IQ_CATEGORIES.length} kategori: {IQ_CATEGORIES.join(', ')}.</li>
                  <li>Total waktu <b>{timeLimit || 30} menit</b>; timer berjalan otomatis setelah menekan &quot;Mulai Tes&quot;.</li>
                  <li>Pastikan semua soal terjawab sebelum mengumpulkan.</li>
                </ul>
              )}
            </div>
            <div className="exam-nav"><span></span><button className="btn primary" onClick={startTest}>Mulai Tes →</button></div>
          </div>
        ) : (
          <>
            <div className="exam-prog">
              <span className="lbl">{testType === 'iq' ? `Bagian ${secIdx + 1} dari ${IQ_CATEGORIES.length}` : title}</span>
              <div className="bar"><i style={{ width: progressPct + '%' }}></i></div>
              <span className="lbl">{progressLabel}</span>
            </div>
            <div className="exam-card">
              {body}
            </div>
            {navButtons}
          </>
        )}
      </div>
    </div>
  )
}
