'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { loadQuestions } from '@/lib/questions'
import type { Candidate, Position, PsikotesResult, PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from '@/lib/types'
import { POSITIONS_DEFAULT } from '@/lib/constants'

export default function HrPsikotesPage() {
  const supabase = createClient()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState<string>('')
  const [cog, setCog] = useState<Record<number, number>>({})
  const [trait, setTrait] = useState<Record<number, number>>({})
  const [sjt, setSjt] = useState<Record<number, number>>({})
  const [examOpen, setExamOpen] = useState(false)
  const [questions, setQuestions] = useState<{ cog: PsiCogQuestion[]; trait: PsiTraitQuestion[]; sjt: PsiSjtQuestion[] } | null>(null)

  const load = async () => {
    const [cRes, pRes, q] = await Promise.all([
      supabase.from('candidates').select('*').order('tanggal', { ascending: false }),
      supabase.from('positions').select('*'),
      loadQuestions(),
    ])
    setCandidates((cRes.data || []) as Candidate[])
    setPositions((pRes.data && pRes.data.length > 0 ? pRes.data : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))) as Position[])
    setQuestions(q)
  }

  useEffect(() => { load() }, [])

  const c = candidates.find(x => x.id === selId) || null

  useEffect(() => {
    if (c?.psikotes) {
      setCog({ ...c.psikotes.cog })
      setTrait({ ...c.psikotes.trait })
      setSjt({ ...c.psikotes.sjt })
    } else {
      setCog({})
      setTrait({})
      setSjt({})
    }
  }, [selId])

  const setCogFn = (i: number, j: number) => setCog(prev => ({ ...prev, [i]: j }))
  const setTraitFn = (i: number, n: number) => setTrait(prev => ({ ...prev, [i]: n }))
  const setSjtFn = (i: number, j: number) => setSjt(prev => ({ ...prev, [i]: j }))

  const PSI_COG = questions?.cog || []
  const PSI_TRAIT = questions?.trait || []
  const PSI_SJT = questions?.sjt || []

  const calc = () => {
    let cTotal = 0
    PSI_COG.forEach((it, i) => { if (cog[i] === it.a) cTotal++ })
    let sTotal = 0
    PSI_SJT.forEach((it, i) => { if (sjt[i] != null) sTotal += it.o[sjt[i]][1] })
    const traits: Record<string, { sum: number; cnt: number }> = {}
    PSI_TRAIT.forEach((it, i) => {
      if (trait[i]) {
        if (!traits[it.t]) traits[it.t] = { sum: 0, cnt: 0 }
        traits[it.t].sum += trait[i]
        traits[it.t].cnt++
      }
    })
    const tAvg: Record<string, number> = {}
    Object.entries(traits).forEach(([k, v]) => { tAvg[k] = v.cnt ? v.sum / v.cnt : 0 })
    const cogLvl = cTotal >= Math.round(PSI_COG.length * 0.73) ? 'baik' : cTotal >= Math.round(PSI_COG.length * 0.47) ? 'cukup' : 'perlu perhatian'
    const sjtLvl = sTotal >= Math.round(PSI_SJT.length * 0.73) ? 'tinggi' : sTotal >= Math.round(PSI_SJT.length * 0.47) ? 'sedang' : 'perlu perhatian'
    const top = Object.entries(tAvg).sort((a, b) => b[1] - a[1])[0]
    const interpret = `Kemampuan kognitif <b>${cogLvl}</b> (${cTotal}/${PSI_COG.length}). Integritas/situasional <b>${sjtLvl}</b> (${sTotal}/${PSI_SJT.length}).` +
      (top && top[1] > 0 ? ` Trait paling menonjol: <b>${top[0]}</b>.` : '')
    return { cogTotal: cTotal, sjtTotal: sTotal, traits: tAvg, interpret }
  }

  const r = calc()

  const save = async () => {
    if (!c) return
    const psiData: PsikotesResult = {
      cog: { ...cog }, trait: { ...trait }, sjt: { ...sjt },
      cogTotal: r.cogTotal, sjtTotal: r.sjtTotal, traits: r.traits,
      date: new Date().toISOString().slice(0, 10),
    }
    await supabase.from('candidates').update({
      psikotes: psiData as any,
      stage: (c.stage === 'screening' || c.stage === 'psikotes') ? 'interview' : c.stage,
    }).eq('id', c.id)
    await load()
  }

  const cogColor = (v: number) => v >= PSI_COG.length * 0.73 ? 'var(--ok)' : v >= PSI_COG.length * 0.47 ? 'var(--hold)' : 'var(--no)'

  if (!questions) return <div className="hint">Memuat soal...</div>

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

      <div className="card card-p" style={{ marginBottom: 16, border: '1.5px solid var(--violet)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <h3 style={{ margin: '0 0 3px' }}>▶ Mode Pengerjaan Kandidat</h3>
            <div className="hint" style={{ margin: 0 }}>
              Buka tes layar penuh agar <b>kandidat mengerjakan sendiri</b>. Hasil otomatis masuk ke profil kandidat.
            </div>
          </div>
          <button className="btn primary" onClick={() => setExamOpen(true)}>Mulai Tes Kandidat</button>
        </div>
      </div>

      <div className="notice">ℹ️ <b>Panel HRD (input / koreksi manual)</b> — gunakan bagian di bawah untuk memasukkan jawaban kandidat secara manual atau meninjau hasil. Terdiri dari 3 bagian: <b>Kognitif</b> (kunci jawaban, benar/salah), <b>Profil Kepribadian</b> (skala 1–5), dan <b>Situasional/Integritas</b>. Hasil dihitung otomatis.</div>

      <div className="card card-p">
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">Bagian 1</span><h3>Tes Kognitif</h3><span className="meta">{PSI_COG.length} soal · skor benar/salah</span>
        </div>
        {PSI_COG.map((it, i) => (
          <div className="q" key={i}>
            <div className="qn"><span className="num">{i + 1}</span><span>{it.q}</span></div>
            {it.o.map((o, j) => (
              <label key={j} className={`opt ${cog[i] === j ? 'sel' : ''}`} onClick={() => setCogFn(i, j)}>
                <span className="key">{'ABCD'[j]}</span><span>{o}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="card card-p" style={{ marginTop: 16 }}>
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">Bagian 2</span><h3>Profil Kepribadian & Gaya Kerja</h3>
          <span className="meta">1 = Sangat tidak setuju · 5 = Sangat setuju</span>
        </div>
        {PSI_TRAIT.map((it, i) => (
          <div className="q" key={i}>
            <div className="qn"><span className="num">{i + 1}</span><span>{it.q}</span></div>
            <div className="likert">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} className={trait[i] === n ? 'on' : ''} onClick={() => setTraitFn(i, n)}>
                  {['Sangat tidak', 'Tidak', 'Netral', 'Setuju', 'Sangat'][n - 1]}<br />{n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card card-p" style={{ marginTop: 16 }}>
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">Bagian 3</span><h3>Tes Situasional & Integritas</h3><span className="meta">pilih tindakan paling tepat</span>
        </div>
        {PSI_SJT.map((it, i) => (
          <div className="q" key={i}>
            <div className="qn"><span className="num">{i + 1}</span><span>{it.q}</span></div>
            {it.o.map((o, j) => (
              <label key={j} className={`opt ${sjt[i] === j ? 'sel' : ''}`} onClick={() => setSjtFn(i, j)}>
                <span className="key">{'ABCD'[j]}</span><span>{o[0]}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="card card-p" style={{ marginTop: 16 }}>
        <h4 className="blk" style={{ marginTop: 0 }}>Hasil Psikotes</h4>
        <div className="scorecard">
          <div className="gauge">
            <svg width="128" height="128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
              <circle cx="64" cy="64" r="54" fill="none" stroke={cogColor(r.cogTotal)} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - r.cogTotal / PSI_COG.length)} />
            </svg>
            <div className="val"><b>{r.cogTotal}/{PSI_COG.length}</b><span>Kognitif</span></div>
          </div>
          <div className="gauge">
            <svg width="128" height="128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
              <circle cx="64" cy="64" r="54" fill="none" stroke={cogColor(r.sjtTotal)} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - r.sjtTotal / PSI_SJT.length)} />
            </svg>
            <div className="val"><b>{r.sjtTotal}/{PSI_SJT.length}</b><span>Integritas</span></div>
          </div>
        </div>
        <h4 className="blk">Profil Kepribadian (rata-rata 1–5)</h4>
        {Object.entries(r.traits).map(([t, val]) => (
          <div className="seg" key={t}>
            <span className="lbl">{t}</span>
            <div className="track"><i style={{ width: Math.round(val / 5 * 100) + '%', background: 'var(--violet)' }}></i></div>
            <span className="pct">{val.toFixed(1)}</span>
          </div>
        ))}
        <div className="verdict-line" style={{ marginTop: 12 }} dangerouslySetInnerHTML={{ __html: r.interpret }} />
        {c ? (
          <button className="btn primary no-print" style={{ marginTop: 14 }} onClick={save}>💾 Simpan hasil ke {c.nama}</button>
        ) : (
          <div className="hint" style={{ marginTop: 12 }}>Pilih kandidat untuk menyimpan, atau pakai sebagai uji coba.</div>
        )}
      </div>

      {examOpen && questions && <ExamModal
        candidate={c}
        positions={positions}
        questions={questions}
        onClose={() => setExamOpen(false)}
        onSave={async (res) => {
          if (res) {
            await supabase.from('candidates').update({
              psikotes: res as any,
              stage: 'interview',
            }).eq('id', res.candidateId)
            await load()
          }
          setExamOpen(false)
        }}
      />}
    </>
  )
}

function ExamModal({ candidate, positions, questions, onClose, onSave }: {
  candidate: Candidate | null
  positions: Position[]
  questions: { cog: PsiCogQuestion[]; trait: PsiTraitQuestion[]; sjt: PsiSjtQuestion[] }
  onClose: () => void
  onSave: (res: any) => Promise<void>
}) {
  const PSI_COG = questions.cog
  const PSI_TRAIT = questions.trait
  const PSI_SJT = questions.sjt

  const [screen, setScreen] = useState<'intro' | 'test' | 'done'>('intro')
  const [sec, setSec] = useState(0)
  const [ans, setAns] = useState<{ cog: Record<number, number>; trait: Record<number, number>; sjt: Record<number, number> }>({ cog: {}, trait: {}, sjt: {} })
  const [name, setName] = useState(candidate?.nama || '')
  const [posId, setPosId] = useState(candidate?.posisi || positions[0]?.id || '')
  const [timeLeft, setTimeLeft] = useState(1800)
  const [timerActive, setTimerActive] = useState(false)

  const supabase = createClient()

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

  useEffect(() => {
    if (timeLeft === 0 && screen === 'test') handleSubmit(true)
  }, [timeLeft])

  const startTest = () => {
    if (!candidate && !name.trim()) { alert('Isi nama kandidat dulu'); return }
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
    return { cogTotal: cTotal, sjtTotal: sTotal, traits: tAvg, cog: { ...a.cog }, trait: { ...a.trait }, sjt: { ...a.sjt }, date: new Date().toISOString().slice(0, 10), via: 'kandidat', candidateId: candidate?.id || null }
  }

  const handleSubmit = async (auto: boolean) => {
    const totalAns = Object.keys(ans.cog).length + Object.keys(ans.trait).length + Object.keys(ans.sjt).length
    const totalQ = PSI_COG.length + PSI_TRAIT.length + PSI_SJT.length
    if (!auto && totalAns < totalQ) {
      if (!confirm(`Masih ada ${totalQ - totalAns} soal belum dijawab. Tetap kumpulkan?`)) return
    }
    const res = score(ans)
    if (!candidate && name.trim()) {
      const { v4: uuidv4 } = await import('uuid')
      const newC = {
        id: uuidv4(), user_id: null, nama: name.trim(), posisi: posId,
        sumber: '—', email: '', telepon: '', catatan: '',
        stage: 'interview', tanggal: new Date().toISOString().slice(0, 10),
        invite_token: null, cv: null, psikotes: res as any, interview: null, onboarding: null,
      }
      await supabase.from('candidates').insert(newC)
    }
    setTimerActive(false)
    setScreen('done')
    onSave(res)
  }

  const m = Math.floor(timeLeft / 60), s = timeLeft % 60

  if (screen === 'done') {
    return (
      <div className="exam-bg show">
        <div className="exam-top">
          <div className="et-brand"><div className="mark">HR</div><span>Lembar Psikotes Kandidat</span></div>
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

  return (
    <div className="exam-bg show">
      <div className="exam-top">
        <div className="et-brand"><div className="mark">HR</div><span>Lembar Psikotes Kandidat</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className={`exam-timer ${timeLeft <= 120 ? 'warn' : ''}`} style={{ display: screen === 'test' ? '' : 'none' }}>
            {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
          </span>
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
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
              </>
            ) : (
              <div className="exam-rules" style={{ background: 'var(--line-soft)' }}><b>{candidate.nama}</b></div>
            )}
            <div className="exam-rules">
              <b>Petunjuk pengerjaan:</b>
              <ul>
                <li>Tes terdiri dari <b>3 bagian</b>: Kemampuan Kognitif ({PSI_COG.length} soal), Profil Kepribadian ({PSI_TRAIT.length} pernyataan), dan Situasional ({PSI_SJT.length} skenario).</li>
                <li>Total waktu <b>30 menit</b>; timer berjalan otomatis setelah menekan "Mulai Tes".</li>
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
