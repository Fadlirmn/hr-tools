'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { loadQuestions } from '@/lib/questions'
import type { Candidate, Position, PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from '@/lib/types'

interface ExamModalProps {
  mode: 'hr' | 'candidate'
  candidate: Candidate | null
  positionName?: string
  positions?: Position[]
  timeLimit?: number | null
  onClose: () => void
  onSave: (res: any) => Promise<void>
}

export default function ExamModal({ mode, candidate, positionName, positions, timeLimit, onClose, onSave }: ExamModalProps) {
  const supabase = createClient()
  const [questions, setQuestions] = useState<{ cog: PsiCogQuestion[]; trait: PsiTraitQuestion[]; sjt: PsiSjtQuestion[] } | null>(null)
  const [screen, setScreen] = useState<'intro' | 'test' | 'done'>(mode === 'candidate' ? 'test' : 'intro')
  const [sec, setSec] = useState(0)
  const [ans, setAns] = useState<{ cog: Record<number, number>; trait: Record<number, number>; sjt: Record<number, number> }>({ cog: {}, trait: {}, sjt: {} })
  const [name, setName] = useState(candidate?.nama || '')
  const [posId, setPosId] = useState(candidate?.posisi || (positions && positions[0]?.id) || '')
  const [timeLeft, setTimeLeft] = useState((timeLimit || 30) * 60)
  const [timerActive, setTimerActive] = useState(mode === 'candidate')

  useEffect(() => {
    loadQuestions().then(setQuestions)
  }, [])

  useEffect(() => {
    if (!timerActive || screen !== 'test') return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerActive, screen])

  if (!questions) return null

  const PSI_COG = questions.cog
  const PSI_TRAIT = questions.trait
  const PSI_SJT = questions.sjt

  const startTest = () => {
    if (mode === 'hr' && !candidate && !name.trim()) { alert('Isi nama kandidat dulu'); return }
    setScreen('test')
    setTimerActive(true)
  }

  const setCog = (i: number, j: number) => setAns(prev => ({ ...prev, cog: { ...prev.cog, [i]: j } }))
  const setTrait = (i: number, n: number) => setAns(prev => ({ ...prev, trait: { ...prev.trait, [i]: n } }))
  const setSjt = (i: number, j: number) => setAns(prev => ({ ...prev, sjt: { ...prev.sjt, [i]: j } }))
  const goSec = (d: number) => setSec(Math.max(0, Math.min(2, sec + d)))

  const score = (a: typeof ans) => {
    let cTotal = 0; PSI_COG.forEach((it, i) => { if (a.cog[i] === it.a) cTotal++ })
    let sTotal = 0; PSI_SJT.forEach((it, i) => { if (a.sjt[i] != null) sTotal += it.o[a.sjt[i]][1] })
    const traits: Record<string, { sum: number; cnt: number }> = {}
    PSI_TRAIT.forEach((it, i) => {
      if (a.trait[i]) {
        if (!traits[it.t]) traits[it.t] = { sum: 0, cnt: 0 }
        traits[it.t].sum += a.trait[i]; traits[it.t].cnt++
      }
    })
    const tAvg: Record<string, number> = {}
    Object.entries(traits).forEach(([k, v]) => { tAvg[k] = v.cnt ? v.sum / v.cnt : 0 })
    return { cogTotal: cTotal, sjtTotal: sTotal, traits: tAvg, cog: { ...a.cog }, trait: { ...a.trait }, sjt: { ...a.sjt }, date: new Date().toISOString().slice(0, 10), via: mode === 'candidate' ? 'kandidat' : 'hr', candidateId: candidate?.id || null }
  }

  const handleSubmit = async (auto: boolean) => {
    const totalAns = Object.keys(ans.cog).length + Object.keys(ans.trait).length + Object.keys(ans.sjt).length
    const totalQ = PSI_COG.length + PSI_TRAIT.length + PSI_SJT.length
    if (!auto && totalAns < totalQ) {
      if (!confirm(`Masih ada ${totalQ - totalAns} soal belum dijawab. Tetap kumpulkan?`)) return
    }
    const res = score(ans)
    if (mode === 'hr' && !candidate && name.trim()) {
      const { v4: uuidv4 } = await import('uuid')
      const newC = {
        id: uuidv4(), user_id: null, nama: name.trim(), posisi: posId,
        sumber: '—', email: '', telepon: '', catatan: '',
        stage: 'interview', tanggal: new Date().toISOString().slice(0, 10),
        invite_token: null, cv: null, psikotes: res as any, interview: null, onboarding: null,
      }
      await supabase.from('candidates').insert(newC)
      res.candidateId = newC.id
    }
    setTimerActive(false)
    setScreen('done')
    await onSave(res)
  }

  useEffect(() => {
    if (timeLeft === 0 && screen === 'test') handleSubmit(true)
  }, [timeLeft])

  const doneScreen = () => {
    if (mode === 'candidate') {
      return (
        <div className="login-bg">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="logo" style={{ justifyContent: 'center' }}>
              <div className="mark" style={{ background: 'var(--ok)' }}>✓</div>
              <h1>Tes Selesai!</h1>
            </div>
            <p style={{ color: 'var(--ink-soft)', margin: '16px 0 24px' }}>Jawaban sudah terkumpul. Lihat hasilnya di dashboard.</p>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>Ke Dashboard</button>
          </div>
        </div>
      )
    }
    return (
      <div className="exam-bg show">
        <div className="exam-top">
          <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>Lembar Psikotes Kandidat</span></div>
          <button className="btn sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none' }} onClick={onClose}>Tutup</button>
        </div>
        <div className="exam-wrap">
          <div className="exam-card exam-done">
            <div className="big">✓</div>
            <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>Terima kasih, tes selesai!</h2>
            <p style={{ color: 'var(--ink-soft)', maxWidth: 430, margin: '0 auto 22px' }}>Jawaban sudah terkumpul.</p>
            <button className="btn primary" onClick={onClose}>Selesai</button>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'done') return doneScreen()

  const m = Math.floor(timeLeft / 60), s = timeLeft % 60

  const secs = [
    {
      title: 'Bagian 1 · Kemampuan Kognitif',
      desc: 'Pilih satu jawaban yang paling tepat.',
      render: () => PSI_COG.map((it, i) => (
        <div className="exam-q" key={i}>
          <div className="qtext"><span className="n">{i + 1}</span><span>{it.q}</span></div>
          {it.o.map((o, j) => (
            <div key={j} className={`exam-opt ${ans.cog[i] === j ? 'sel' : ''}`} onClick={() => setCog(i, j)}>
              <span className="k">{'ABCD'[j]}</span><span>{o}</span>
            </div>
          ))}
        </div>
      )),
      answered: Object.keys(ans.cog).length + '/' + PSI_COG.length,
    },
    {
      title: 'Bagian 2 · Profil Kepribadian & Gaya Kerja',
      desc: '1 = Sangat tidak setuju, 5 = Sangat setuju. Tidak ada benar/salah.',
      render: () => PSI_TRAIT.map((it, i) => (
        <div className="exam-q" key={i}>
          <div className="qtext"><span className="n">{i + 1}</span><span>{it.q}</span></div>
          <div className="exam-likert">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} className={ans.trait[i] === n ? 'on' : ''} onClick={() => setTrait(i, n)}>
                {['Sangat tidak setuju', 'Tidak setuju', 'Netral', 'Setuju', 'Sangat setuju'][n - 1]}
                <span className="num">{n}</span>
              </button>
            ))}
          </div>
        </div>
      )),
      answered: Object.keys(ans.trait).length + '/' + PSI_TRAIT.length,
    },
    {
      title: 'Bagian 3 · Situasional & Integritas',
      desc: 'Pilih tindakan yang paling mendekati.',
      render: () => PSI_SJT.map((it, i) => (
        <div className="exam-q" key={i}>
          <div className="qtext"><span className="n">{i + 1}</span><span>{it.q}</span></div>
          {it.o.map((o, j) => (
            <div key={j} className={`exam-opt ${ans.sjt[i] === j ? 'sel' : ''}`} onClick={() => setSjt(i, j)}>
              <span className="k">{'ABCD'[j]}</span><span>{o[0]}</span>
            </div>
          ))}
        </div>
      )),
      answered: Object.keys(ans.sjt).length + '/' + PSI_SJT.length,
    },
  ]

  if (mode === 'candidate') {
    return (
      <>
        <div className="exam-top" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>Psikotes Kandidat</span></div>
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
            <span className="lbl">{['Bagian 1 dari 3', 'Bagian 2 dari 3', 'Bagian 3 dari 3'][sec]}</span>
            <div className="bar"><i style={{ width: Math.round(((sec + 1) / 3) * 100) + '%' }}></i></div>
            <span className="lbl">Terjawab {secs[sec].answered}</span>
          </div>
          <div className="exam-card" style={{ margin: '0 auto', maxWidth: 800 }}>
            <div className="exam-sec-h">{secs[sec].title}</div>
            <div className="exam-sec-d">{secs[sec].desc}</div>
            {secs[sec].render()}
          </div>
          <div className="exam-nav" style={{ maxWidth: 800, margin: '0 auto', padding: '16px 0' }}>
            {sec > 0 ? <button className="btn" onClick={() => goSec(-1)}>← Sebelumnya</button> : <span></span>}
            {sec < 2
              ? <button className="btn primary" onClick={() => goSec(1)}>Lanjut →</button>
              : <button className="btn primary" onClick={() => handleSubmit(false)}>✓ Kumpulkan Jawaban</button>
            }
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="exam-bg show">
      <div className="exam-top">
        <div className="et-brand"><img src="/logo.png" className="mark" alt="" /><span>Lembar Psikotes Kandidat</span></div>
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
            <h2>Tes Psikologi Kandidat</h2>
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
              <ul>
                <li>Tes terdiri dari <b>3 bagian</b>: Kemampuan Kognitif ({PSI_COG.length} soal), Profil Kepribadian ({PSI_TRAIT.length} pernyataan), dan Situasional ({PSI_SJT.length} skenario).</li>
                <li>Total waktu <b>{timeLimit || 30} menit</b>; timer berjalan otomatis setelah menekan "Mulai Tes".</li>
                <li>Bagian kepribadian <b>tidak ada benar/salah</b>.</li>
                <li>Pastikan semua soal terjawab sebelum mengumpulkan.</li>
              </ul>
            </div>
            <div className="exam-nav"><span></span><button className="btn primary" onClick={startTest}>Mulai Tes →</button></div>
          </div>
        ) : (
          <>
            <div className="exam-prog">
              <span className="lbl">{['Bagian 1 dari 3', 'Bagian 2 dari 3', 'Bagian 3 dari 3'][sec]}</span>
              <div className="bar"><i style={{ width: Math.round(((sec + 1) / 3) * 100) + '%' }}></i></div>
              <span className="lbl">Terjawab {secs[sec].answered}</span>
            </div>
            <div className="exam-card">
              <div className="exam-sec-h">{secs[sec].title}</div>
              <div className="exam-sec-d">{secs[sec].desc}</div>
              {secs[sec].render()}
            </div>
            <div className="exam-nav">
              {sec > 0 ? <button className="btn" onClick={() => goSec(-1)}>← Sebelumnya</button> : <span></span>}
              {sec < 2
                ? <button className="btn primary" onClick={() => goSec(1)}>Lanjut →</button>
                : <button className="btn primary" onClick={() => handleSubmit(false)}>✓ Kumpulkan Jawaban</button>
              }
            </div>
          </>
        )}
      </div>
    </div>
  )
}
