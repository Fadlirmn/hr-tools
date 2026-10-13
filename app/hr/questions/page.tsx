'use client'

import { useEffect, useState } from 'react'
import { loadQuestions, saveQuestionType } from '@/lib/questions'
import type { DiscQuestion, DiscLetter, IqQuestion, IqCategory } from '@/lib/types'

type Tab = 'disc' | 'iq'

const IQ_CATEGORIES: IqCategory[] = ['Logika', 'Numerik', 'Verbal', 'Spasial']
const DISC_LETTERS: DiscLetter[] = ['a', 'b', 'c', 'd']

export default function HrQuestionsPage() {
  const [tab, setTab] = useState<Tab>('disc')
  const [disc, setDisc] = useState<DiscQuestion[]>([])
  const [iq, setIq] = useState<IqQuestion[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const q = await loadQuestions()
      setDisc(q.disc)
      setIq(q.iq)
      setLoaded(true)
    })()
  }, [])

  const showMsg = (s: string) => { setMsg(s); setTimeout(() => setMsg(''), 2000) }

  const save = async () => {
    setSaving(true)
    const data = tab === 'disc' ? disc : iq
    const ok = await saveQuestionType(tab, data)
    if (ok) showMsg('Tersimpan')
    else showMsg('Gagal menyimpan')
    setSaving(false)
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'disc', label: 'Tes DISC' },
    { key: 'iq', label: 'Tes IQ' },
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

      {tab === 'disc' && <DiscEditor data={disc} onChange={setDisc} />}
      {tab === 'iq' && <IqEditor data={iq} onChange={setIq} />}
    </>
  )
}

function DiscEditor({ data, onChange }: { data: DiscQuestion[]; onChange: (d: DiscQuestion[]) => void }) {
  const updateOption = (i: number, letter: DiscLetter, val: string) => {
    const next = [...data]
    next[i] = { ...next[i], options: { ...next[i].options, [letter]: val } }
    onChange(next)
  }

  return (
    <div className="card card-p">
      <div style={{ marginBottom: 12 }}>
        <h4 className="blk" style={{ margin: 0 }}>Soal Tes DISC ({data.length})</h4>
        <div className="hint" style={{ marginTop: 4 }}>
          Hanya teks pilihan yang dapat diedit. Urutan dan jumlah soal terkait langsung dengan formula skor
          (tabel konversi DISC), sehingga tambah/hapus/urutan ulang soal tidak didukung.
        </div>
      </div>
      {data.map((q, i) => (
        <div key={q.no} className="q" style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--violet)', minWidth: 28 }}>#{q.no}</span>
            <div className="grid2" style={{ flex: 1, gap: 8 }}>
              {DISC_LETTERS.map(letter => (
                <label key={letter} className="opt" style={{ padding: '6px 10px', margin: 0, fontSize: 13 }}>
                  <span className="key" style={{ width: 20, height: 20, fontSize: 10 }}>{letter.toUpperCase()}</span>
                  <input type="text" value={q.options[letter]} onChange={e => updateOption(i, letter, e.target.value)}
                    style={{ border: 'none', padding: 0, fontSize: 13, background: 'transparent' }} />
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function IqEditor({ data, onChange }: { data: IqQuestion[]; onChange: (d: IqQuestion[]) => void }) {
  const update = (i: number, field: 'sec' | 'q', val: string) => {
    const next = [...data]
    next[i] = { ...next[i], [field]: val } as IqQuestion
    onChange(next)
  }
  const updateOpt = (i: number, oi: number, val: string) => {
    const next = [...data]
    next[i].o[oi] = val
    onChange(next)
  }
  const updateAnswer = (i: number, oi: number) => {
    const next = [...data]
    next[i] = { ...next[i], a: oi }
    onChange(next)
  }
  const add = () => onChange([...data, { sec: 'Logika', q: '', o: ['', '', '', ''], a: 0 }])
  const remove = (i: number) => onChange(data.filter((_, idx) => idx !== i))
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
        <h4 className="blk" style={{ margin: 0 }}>Soal IQ ({data.length})</h4>
        <button className="btn sm primary" onClick={add}>＋ Soal</button>
      </div>
      {data.map((q, i) => (
        <div key={i} className="q" style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--violet)', minWidth: 28 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <select value={q.sec} onChange={e => update(i, 'sec', e.target.value)}
                style={{ fontSize: 12, marginBottom: 6, padding: '6px 10px', width: 'auto' }}>
                {IQ_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
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
                <input type="radio" name={`iq-${i}`} checked={q.a === oi} onChange={() => updateAnswer(i, oi)} />
                {l}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
