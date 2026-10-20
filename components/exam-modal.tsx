'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { loadQuestions } from '@/lib/questions'
import { calcDiscGraphs } from '@/lib/disc-scoring'
import { calcIq, IQ_CATEGORIES } from '@/lib/iq-scoring'
import type { Candidate, Position, DiscQuestion, DiscLetter, IqQuestion, DiscAnswer, DiscResult, IqResult } from '@/lib/types'

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

export default function ExamModal({ mode, testType, candidate, positions, timeLimit, onClose, onSave }: ExamModalProps) {
  const [discQuestions, setDiscQuestions] = useState<DiscQuestion[]>([])
  const [iqQuestions, setIqQuestions] = useState<IqQuestion[]>([])
  const [screen, setScreen] = useState<'intro' | 'test' | 'done'>(mode === 'candidate' ? 'test' : 'intro')
  const [secIdx, setSecIdx] = useState(0) // dipakai IQ untuk navigasi kategori (mode HR)
  const [qIdx, setQIdx] = useState(0) // soal aktif (mode kandidat: 1 soal per layar)
  const [discAns, setDiscAns] = useState<Record<number, DiscAnswer>>({})
  const [iqAns, setIqAns] = useState<Record<number, number>>({})
  const [name, setName] = useState(candidate?.nama || '')
  const [posId, setPosId] = useState(candidate?.posisi || (positions && positions[0]?.id) || '')
  // Timer berbasis deadline (epoch ms) di sisi client. Sisa waktu selalu dihitung
  // dari Date.now() sehingga tidak drift saat tab di-background.
  const hasTimer = mode === 'candidate' || (timeLimit != null && timeLimit > 0)
  const deadlineRef = useRef<number | null>(null)
  const [timeLeft, setTimeLeft] = useState((timeLimit || 0) * 60)
  const [timerActive, setTimerActive] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const autoSubmittedRef = useRef(false)

  // Persist sesi tes kandidat (deadline + jawaban + posisi) agar refresh tidak reset timer.
  const storageKey = mode === 'candidate' && candidate ? `exam:${testType}:${candidate.id}` : null
  const readSession = (): { discAns?: Record<number, DiscAnswer>; iqAns?: Record<number, number>; qIdx?: number } | null => {
    if (!storageKey) return null
    try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : null } catch { return null }
  }
  const clearSession = useCallback(() => {
    if (!storageKey) return
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }, [storageKey])

  const [startError, setStartError] = useState<string | null>(null)

  const activateDeadline = (deadline: number) => {
    deadlineRef.current = deadline
    setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    setTimerActive(true)
  }

  /**
   * Mulai timer.
   * - Mode kandidat: server mencatat started_at (sekali) dan mengembalikan sisa detik
   *   (min(started_at + time_limit, close_at) - now_server). Client membangun deadline
   *   lokal = Date.now() + remainingSec*1000 lalu menghitung mundur sendiri — tidak ada
   *   request berulang ke server, tapi angka awalnya dari server sehingga refresh/ganti
   *   perangkat tidak mereset waktu.
   * - Mode HR: murni lokal (timer opsional).
   */
  const beginTimer = useCallback(async () => {
    if (mode === 'candidate') {
      const saved = readSession()
      if (saved?.discAns) setDiscAns(saved.discAns)
      if (saved?.iqAns) setIqAns(saved.iqAns)
      if (typeof saved?.qIdx === 'number') setQIdx(saved.qIdx)
      try {
        const res = await fetch('/api/exam-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ type: testType }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setStartError(data.error || 'Gagal memulai tes'); return }
        const remainingSec = Number(data.remainingSec)
        activateDeadline(Date.now() + (Number.isFinite(remainingSec) ? remainingSec : 0) * 1000)
      } catch {
        setStartError('Tidak bisa terhubung ke server untuk memulai tes. Coba lagi.')
      }
      return
    }
    if (!hasTimer) return
    activateDeadline(Date.now() + (timeLimit as number) * 60 * 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, testType, hasTimer, timeLimit, storageKey])

  useEffect(() => {
    loadQuestions().then(q => {
      setDiscQuestions(q.disc)
      setIqQuestions(q.iq)
      setLoaded(true)
      if (mode === 'candidate') beginTimer()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Simpan progres ke localStorage tiap ada perubahan (mode kandidat).
  useEffect(() => {
    if (!storageKey || !timerActive) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ discAns, iqAns, qIdx }))
    } catch { /* ignore */ }
  }, [storageKey, timerActive, discAns, iqAns, qIdx])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  useEffect(() => {
    if (!timerActive || screen !== 'test' || !hasTimer) return
    const tick = () => {
      const dl = deadlineRef.current
      if (dl == null) return
      const left = Math.max(0, Math.ceil((dl - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) clearTimer()
    }
    tick()
    intervalRef.current = setInterval(tick, 500)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', tick)
    return () => {
      clearTimer()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', tick)
    }
  }, [timerActive, screen, hasTimer, clearTimer])

  const title = testType === 'disc' ? 'Tes DISC' : 'Tes IQ'

  const startTest = () => {
    if (mode === 'hr' && !candidate && !name.trim()) { alert('Isi nama kandidat dulu'); return }
    setScreen('test')
    beginTimer()
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
    // Submit paksa: tidak ada konfirmasi walau masih ada soal belum dijawab.
    setTimerActive(false)
    clearTimer()
    clearSession()

    if (mode === 'candidate' && candidate) {
      const body = testType === 'disc'
        ? { type: 'disc', candidateId: candidate.id, answers: discAns, auto }
        : { type: 'iq', candidateId: candidate.id, answers: iqAns, auto }
      // Submit paksa: jawaban dikirim apa adanya (boleh belum lengkap). Jika jaringan
      // gagal, coba ulang beberapa kali agar hasil tetap tersimpan.
      let data: { error?: string; result?: ExamResult } = {}
      let ok = false
      for (let attempt = 0; attempt < 4 && !ok; attempt++) {
        try {
          const res = await fetch('/api/exam-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          })
          data = await res.json().catch(() => ({}))
          ok = res.ok
          if (!ok && res.status < 500) break // ditolak server (409/403): tidak perlu retry
        } catch {
          data = { error: 'Tidak bisa terhubung ke server.' }
        }
        if (!ok) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
      if (!ok) {
        alert(data.error || 'Jawaban tidak diterima server.')
        setScreen('done')
        await onSave(null)
        return
      }
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
  }, [discAns, iqAns, mode, candidate, name, posId, testType, discQuestions, iqQuestions, onSave, clearTimer, clearSession])

  // Auto-submit sekali saat waktu habis (hanya jika timer aktif).
  useEffect(() => {
    if (!hasTimer || !timerActive || screen !== 'test' || !loaded) return
    if (timeLeft === 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true
      handleSubmit(true)
    }
  }, [timeLeft, hasTimer, timerActive, screen, loaded, handleSubmit])

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

  const h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), s = timeLeft % 60
  const timeLabel = (h > 0 ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const timerClass = `exam-timer ${timeLeft <= 30 ? 'crit' : timeLeft <= 120 ? 'warn' : ''}`
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

  // ===== Mode kandidat: 1 soal per layar =====
  const totalQ = testType === 'disc' ? discQuestions.length : iqQuestions.length
  const isAnswered = (i: number) => testType === 'disc'
    ? !!(discAns[discQuestions[i]?.no]?.most && discAns[discQuestions[i]?.no]?.least)
    : iqAns[i] != null
  const answeredTotal = testType === 'disc' ? discAnsweredCount : iqAnsweredCount
  const goTo = (i: number) => {
    setQIdx(Math.max(0, Math.min(totalQ - 1, i)))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  const renderOne = () => {
    if (testType === 'disc') {
      const q = discQuestions[qIdx]
      if (!q) return null
      const ans = discAns[q.no] || {}
      return (
        <>
          <div className="exam-sec-h">{title} · Soal {qIdx + 1} dari {totalQ}</div>
          <div className="exam-sec-d">Pilih satu kata <b>Most (M)</b> — paling menggambarkan diri Anda — dan satu kata <b>Least (L)</b> — paling tidak menggambarkan diri Anda. Tidak boleh huruf yang sama.</div>
          <div className="exam-q">
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
        </>
      )
    }
    const q = iqQuestions[qIdx]
    if (!q) return null
    return (
      <>
        <div className="exam-sec-h">{title} · {q.sec}</div>
        <div className="exam-sec-d">Soal {qIdx + 1} dari {totalQ} — pilih satu jawaban yang paling tepat.</div>
        <div className="exam-q">
          <div className="qtext"><span className="n">{qIdx + 1}</span><span>{q.q}</span></div>
          {q.o.map((o, oi) => (
            <div key={oi} className={`exam-opt ${iqAns[qIdx] === oi ? 'sel' : ''}`} onClick={() => setIq(qIdx, oi)}>
              <span className="k">{'ABCD'[oi]}</span><span>{o}</span>
            </div>
          ))}
        </div>
      </>
    )
  }

  const candidateNav = (
    <div className="exam-nav">
      {qIdx > 0 ? <button className="btn" onClick={() => goTo(qIdx - 1)}>← Sebelumnya</button> : <span></span>}
      {qIdx < totalQ - 1 ? (
        <button className="btn primary" onClick={() => goTo(qIdx + 1)}>Lanjut →</button>
      ) : (
        <button className="btn primary" onClick={() => handleSubmit(false)}>✓ Kumpulkan Jawaban</button>
      )}
    </div>
  )

  if (mode === 'candidate' && startError) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="logo" style={{ justifyContent: 'center' }}>
            <div className="mark" style={{ background: 'var(--accent)' }}>!</div>
            <h1>Tes tidak bisa dimulai</h1>
          </div>
          <p style={{ color: 'var(--ink-soft)', margin: '16px 0 24px' }}>{startError}</p>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>Kembali</button>
        </div>
      </div>
    )
  }

  if (mode === 'candidate' && !timerActive) {
    return <div className="login-bg"><div className="login-card" style={{ textAlign: 'center' }}><p className="hint">Menyiapkan tes…</p></div></div>
  }

  if (mode === 'candidate') {
    return (
      <>
        <div className="exam-top" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>{title} Kandidat</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {hasTimer && (
              <div className="exam-timer-wrap" title="Sisa waktu pengerjaan">
                <span className="exam-timer-lbl">Sisa waktu{timeLimit ? ` · dari ${timeLimit} menit` : ''}</span>
                <span className={timerClass} aria-live="polite">{timeLabel}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 64 }}>
          <div className="exam-prog" style={{ paddingTop: 16 }}>
            <span className="lbl">Soal {qIdx + 1}/{totalQ}</span>
            <div className="bar"><i style={{ width: (totalQ ? Math.round(((qIdx + 1) / totalQ) * 100) : 0) + '%' }}></i></div>
            <span className="lbl">Terjawab {answeredTotal}/{totalQ}</span>
          </div>
          <div className="exam-card" style={{ margin: '0 auto', maxWidth: 800 }}>
            {renderOne()}
            <div className="exam-grid">
              {Array.from({ length: totalQ }, (_, i) => (
                <button key={i} type="button" className={i === qIdx ? 'cur' : isAnswered(i) ? 'done' : ''} onClick={() => goTo(i)}>{i + 1}</button>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 0' }}>{candidateNav}</div>
        </div>
      </>
    )
  }

  return (
    <div className="exam-bg show">
      <div className="exam-top">
        <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>{title} Kandidat</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {hasTimer && screen === 'test' && (
            <span className={timerClass}>{timeLabel}</span>
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
                  {hasTimer ? <li>Total waktu <b>{timeLimit} menit</b>; timer berjalan otomatis setelah menekan &quot;Mulai Tes&quot;.</li> : <li>Tanpa batas waktu.</li>}
                  <li>Tidak ada jawaban benar/salah pada tes ini.</li>
                </ul>
              ) : (
                <ul>
                  <li>Tes terdiri dari <b>{iqQuestions.length} soal</b> dalam {IQ_CATEGORIES.length} kategori: {IQ_CATEGORIES.join(', ')}.</li>
                  {hasTimer ? <li>Total waktu <b>{timeLimit} menit</b>; timer berjalan otomatis setelah menekan &quot;Mulai Tes&quot;.</li> : <li>Tanpa batas waktu.</li>}
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
