'use client'

import { useEffect, useState, useCallback } from 'react'
import { loadQuestions, saveQuestionType } from '@/lib/questions'
import type { PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from '@/lib/types'

type Tab = 'cog' | 'trait' | 'sjt'

export default function HrQuestionsPage() {
  const [tab, setTab] = useState<Tab>('cog')
  const [cog, setCog] = useState<PsiCogQuestion[]>([])
  const [trait, setTrait] = useState<PsiTraitQuestion[]>([])
  const [sjt, setSjt] = useState<PsiSjtQuestion[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const q = await loadQuestions()
      setCog(q.cog)
      setTrait(q.trait)
      setSjt(q.sjt)
      setLoaded(true)
    })()
  }, [])

  const showMsg = (s: string) => { setMsg(s); setTimeout(() => setMsg(''), 2000) }

  const save = async () => {
    setSaving(true)
    const data = tab === 'cog' ? cog : tab === 'trait' ? trait : sjt
    const ok = await saveQuestionType(tab, data)
    if (ok) showMsg('Tersimpan')
    else showMsg('Gagal menyimpan')
    setSaving(false)
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'cog', label: 'Kognitif' },
    { key: 'trait', label: 'Kepribadian' },
    { key: 'sjt', label: 'Situasional' },
  ]

  if (!loaded) return <div className="hint">Memuat...</div>

  return (
    <>
      <div className="selectbar no-print" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(t => (
            <button key={t.key} className={`btn sm ${tab === t.key ? 'primary' : ''}`}
              onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
        <button className="btn primary sm" onClick={save} disabled={saving}>
          {saving ? 'Menyimpan...' : '💾 Simpan'}
        </button>
      </div>

      {msg && <div className="toast show" style={{ position: 'static', transform: 'none', marginBottom: 12, opacity: 1 }}>{msg}</div>}

      {tab === 'cog' && <CogEditor data={cog} onChange={setCog} />}
      {tab === 'trait' && <TraitEditor data={trait} onChange={setTrait} />}
      {tab === 'sjt' && <SjtEditor data={sjt} onChange={setSjt} />}
    </>
  )
}

function CogEditor({ data, onChange }: { data: PsiCogQuestion[]; onChange: (d: PsiCogQuestion[]) => void }) {
  const update = (i: number, field: string, val: string | number) => {
    const next = [...data]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }
  const updateOpt = (i: number, oi: number, val: string) => {
    const next = [...data]
    next[i].o[oi] = val
    onChange(next)
  }
  const add = () => {
    onChange([...data, { sec: '', q: '', o: ['', '', '', ''], a: 0 }])
  }
  const remove = (i: number) => {
    onChange(data.filter((_, idx) => idx !== i))
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= data.length) return
    const next = [...data]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="card card-p">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 className="blk" style={{ margin: 0 }}>Soal Kognitif ({data.length})</h4>
        <button className="btn sm primary" onClick={add}>＋ Soal</button>
      </div>
      {data.map((q, i) => (
        <div key={i} className="q" style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--violet)', minWidth: 28 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <input type="text" value={q.sec} onChange={e => update(i, 'sec', e.target.value)}
                placeholder="Bagian (cth. A. Logika)" style={{ fontSize: 12, marginBottom: 6, padding: '6px 10px' }} />
              <input type="text" value={q.q} onChange={e => update(i, 'q', e.target.value)}
                placeholder="Pertanyaan..." style={{ fontWeight: 600, padding: '6px 10px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              <button className="btn sm" onClick={() => move(i, -1)} title="Naik">↑</button>
              <button className="btn sm" onClick={() => move(i, 1)} title="Turun">↓</button>
              <button className="btn sm danger" onClick={() => remove(i)} title="Hapus">✕</button>
            </div>
          </div>
          <div className="grid2" style={{ gap: 8 }}>
            {q.o.map((o, oi) => (
              <label key={oi} className="opt" style={{ padding: '6px 10px', margin: 0, fontSize: 13 }}>
                <span className="key" style={{ width: 20, height: 20, fontSize: 10 }}>{'ABCD'[oi]}</span>
                <input type="text" value={o} onChange={e => updateOpt(i, oi, e.target.value)}
                  style={{ border: 'none', padding: 0, fontSize: 13, background: 'transparent' }} />
              </label>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Jawaban benar:</span>
            {['A', 'B', 'C', 'D'].map((l, oi) => (
              <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="radio" name={`cog-${i}`} checked={q.a === oi} onChange={() => update(i, 'a', oi)} />
                {l}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TraitEditor({ data, onChange }: { data: PsiTraitQuestion[]; onChange: (d: PsiTraitQuestion[]) => void }) {
  const update = (i: number, field: string, val: string) => {
    const next = [...data]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }
  const add = () => onChange([...data, { t: '', q: '' }])
  const remove = (i: number) => onChange(data.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= data.length) return
    const next = [...data]; [next[i], next[j]] = [next[j], next[i]]; onChange(next)
  }

  return (
    <div className="card card-p">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 className="blk" style={{ margin: 0 }}>Pernyataan Kepribadian ({data.length})</h4>
        <button className="btn sm primary" onClick={add}>＋ Pernyataan</button>
      </div>
      {data.map((q, i) => (
        <div key={i} className="q" style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--violet)', minWidth: 28, marginTop: 6 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <input type="text" value={q.t} onChange={e => update(i, 't', e.target.value)}
                placeholder="Trait (cth. Inisiatif)" style={{ fontSize: 12, marginBottom: 6, padding: '6px 10px' }} />
              <input type="text" value={q.q} onChange={e => update(i, 'q', e.target.value)}
                placeholder="Pernyataan..." style={{ padding: '6px 10px' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 6 }}>
              <button className="btn sm" onClick={() => move(i, -1)}>↑</button>
              <button className="btn sm" onClick={() => move(i, 1)}>↓</button>
              <button className="btn sm danger" onClick={() => remove(i)}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SjtEditor({ data, onChange }: { data: PsiSjtQuestion[]; onChange: (d: PsiSjtQuestion[]) => void }) {
  const update = (i: number, field: string, val: string) => {
    const next = [...data]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }
  const updateOpt = (i: number, oi: number, field: 'text' | 'score', val: string | number) => {
    const next = [...data]
    const opt = [...next[i].o] as [string, number][]
    opt[oi] = field === 'text' ? [val as string, opt[oi][1]] : [opt[oi][0], val as number]
    next[i] = { ...next[i], o: opt }
    onChange(next)
  }
  const add = () => onChange([...data, { q: '', o: [['', 0], ['', 0], ['', 0], ['', 0]] }])
  const remove = (i: number) => onChange(data.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= data.length) return
    const next = [...data]; [next[i], next[j]] = [next[j], next[i]]; onChange(next)
  }

  return (
    <div className="card card-p">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 className="blk" style={{ margin: 0 }}>Skenario Situasional ({data.length})</h4>
        <button className="btn sm primary" onClick={add}>＋ Skenario</button>
      </div>
      {data.map((q, i) => (
        <div key={i} className="q" style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--violet)', minWidth: 28, marginTop: 6 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <input type="text" value={q.q} onChange={e => update(i, 'q', e.target.value)}
                placeholder="Skenario..." style={{ fontWeight: 600, padding: '6px 10px' }} />
              <div className="grid2" style={{ gap: 6, marginTop: 8 }}>
                {q.o.map((o, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--muted)', minWidth: 14 }}>{'ABCD'[oi]}</span>
                    <input type="text" value={o[0]} onChange={e => updateOpt(i, oi, 'text', e.target.value)}
                      placeholder="Opsi..." style={{ flex: 1, fontSize: 12, padding: '5px 8px' }} />
                    <input type="number" value={o[1]} onChange={e => updateOpt(i, oi, 'score', Number(e.target.value))}
                      style={{ width: 44, fontSize: 12, padding: '5px 8px', textAlign: 'center' }}
                      placeholder="Skor" min={0} max={3} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 6 }}>
              <button className="btn sm" onClick={() => move(i, -1)}>↑</button>
              <button className="btn sm" onClick={() => move(i, 1)}>↓</button>
              <button className="btn sm danger" onClick={() => remove(i)}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
