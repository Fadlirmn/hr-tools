'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchCandidates } from '@/lib/db-hr'
import { loadQuestions } from '@/lib/questions'
import ExamModal from '@/components/exam-modal'
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
    const [cands, pRes, q] = await Promise.all([
      fetchCandidates(),
      supabase.from('positions').select('*'),
      loadQuestions(),
    ])
    setCandidates(cands as Candidate[])
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
    return { cogTotal: cTotal, sjtTotal: sTotal, traits: tAvg, cogLvl, sjtLvl, topTrait: top }
  }

  // Wrap dengan useMemo agar tidak recompute setiap render
  const r = useMemo(() => calc(), [cog, trait, sjt, PSI_COG, PSI_TRAIT, PSI_SJT])

  const save = async () => {
    if (!c) return
    const psiData: PsikotesResult = {
      cog: { ...cog }, trait: { ...trait }, sjt: { ...sjt },
      cogTotal: r.cogTotal, sjtTotal: r.sjtTotal, traits: r.traits,
      date: new Date().toISOString().slice(0, 10),
    }
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: c.id,
        psikotes: psiData,
        stage: (c.stage === 'screening' || c.stage === 'psikotes') ? 'interview' : c.stage,
      }),
    })
    await load()
  }

  // Guard div-by-zero: jika pertanyaan belum load, hindari NaN
  const cogColor = (v: number) =>
    !PSI_COG.length ? 'var(--line)' :
    v >= PSI_COG.length * 0.73 ? 'var(--ok)' :
    v >= PSI_COG.length * 0.47 ? 'var(--hold)' : 'var(--no)'

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
        <div className="verdict-line" style={{ marginTop: 12 }}>
          Kemampuan kognitif <b>{r.cogLvl}</b> ({r.cogTotal}/{PSI_COG.length}). Integritas/situasional <b>{r.sjtLvl}</b> ({r.sjtTotal}/{PSI_SJT.length}).
          {r.topTrait && r.topTrait[1] > 0 && <> Trait paling menonjol: <b>{r.topTrait[0]}</b>.</>}
        </div>
        {c ? (
          <button className="btn primary no-print" style={{ marginTop: 14 }} onClick={save}>💾 Simpan hasil ke {c.nama}</button>
        ) : (
          <div className="hint" style={{ marginTop: 12 }}>Pilih kandidat untuk menyimpan, atau pakai sebagai uji coba.</div>
        )}
      </div>

      {examOpen && <ExamModal
        mode="hr"
        candidate={c}
        positions={positions}
        onClose={() => setExamOpen(false)}
        onSave={async (res) => {
          if (res) {
            await fetch('/api/candidates', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                id: res.candidateId,
                psikotes: res,
                stage: 'interview',
              }),
            })
            await load()
          }
          setExamOpen(false)
        }}
      />}
    </>
  )
}
