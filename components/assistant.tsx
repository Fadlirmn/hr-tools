'use client'

import { useEffect, useRef, useState, Fragment, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { IconSparkle, IconX, IconSend, IconStop, IconAlert } from './icons'

type Report = {
  title: string; generated_at: string; posisi: string | null; total: number; cv_masuk: number; dianalisis_ai: number
  perlu_dinilai: { id: string; nama: string }[]; verdict: Record<string, number>; sumber: Record<string, number>
  tahap: Record<string, number>; alasan_tidak_lanjut: Record<string, number>
  peringkat: { id: string; nama: string; posisi: string; skor: number; sumber_skor: 'HR' | 'AI'; verdict: string }[]
}
type Action = { type: 'navigate'; href: string } | { type: 'open_cv'; id: string; applyAi: boolean } | { type: 'open_bulk' } | { type: 'report'; data: Report }
type Msg = { role: 'user' | 'assistant'; content: string; report?: Report; sys?: boolean; warn?: boolean }

const CHIPS: [string, string][] = [
  ['Perlu dinilai', 'Siapa saja yang perlu saya nilai sekarang?'],
  ['Laporan screening', 'Buatkan laporan hasil screening hari ini'],
  ['Bandingkan Marketing', 'Bandingkan kandidat Marketing'],
  ['Upload massal', 'Buka upload CV massal'],
  ['Posisi & bobot', 'Buka pengaturan posisi dan bobot'],
]

const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : v === 'Tidak Lolos' ? 'no' : 'neutral'

/** Markdown minimal: **tebal**, bullet "- ", paragraf. Dirender sebagai elemen React (tanpa innerHTML). */
function Md({ text }: { text: string }) {
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>)
  const out: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => { if (list.length) { out.push(<ul key={'u' + out.length}>{list}</ul>); list = [] } }
  text.split('\n').forEach((l, i) => {
    const m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/)
    if (m) list.push(<li key={i}>{bold(m[1])}</li>)
    else { flush(); if (l.trim()) out.push(<p key={i}>{bold(l)}</p>) }
  })
  flush()
  return <>{out}</>
}

function ReportCard({ r, onOpen }: { r: Report; onOpen: (id: string) => void }) {
  const maxSrc = Math.max(1, ...Object.values(r.sumber))
  const alasan = Object.entries(r.alasan_tidak_lanjut)
  return (
    <div className="as-report">
      <h5>{r.title}{r.posisi ? ` · ${r.posisi}` : ''} · {new Date(r.generated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</h5>
      <div className="kpis">
        <div className="kpi"><b>{r.total}</b><span>kandidat</span></div>
        <div className="kpi"><b>{r.cv_masuk}</b><span>CV masuk</span></div>
        <div className="kpi"><b>{r.dianalisis_ai}</b><span>dianalisis AI</span></div>
        <div className="kpi"><b>{r.perlu_dinilai.length}</b><span>perlu dinilai</span></div>
      </div>
      <div className="row-chips">
        {(['Lolos', 'Pertimbangkan', 'Tidak Lolos', 'Data belum cukup'] as const).map(v => <span key={v} className={`chip ${chipClass(v)}`}>{v} {r.verdict[v] || 0}</span>)}
      </div>
      <div className="lbl">Sumber CV</div>
      {Object.entries(r.sumber).map(([k, n]) => (
        <div className="srcrow" key={k}><span>{k}</span><div className="bar"><i style={{ width: `${Math.round(n / maxSrc * 100)}%` }} /></div><b>{n}</b></div>
      ))}
      {alasan.length > 0 && (<><div className="lbl">Alasan tidak lanjut</div>{alasan.map(([k, n]) => <div className="srcrow" key={k}><span>{k}</span><div /><b>{n}</b></div>)}</>)}
      {r.peringkat.length > 0 && (
        <table>
          <thead><tr><th>Kandidat</th><th>Posisi</th><th>Skor</th></tr></thead>
          <tbody>{r.peringkat.map(x => (
            <tr key={x.id}><td><button type="button" className="linkish" onClick={() => onOpen(x.id)}>{x.nama}</button></td><td>{x.posisi}</td>
              <td style={{ whiteSpace: 'nowrap' }}><span className={`chip ${chipClass(x.verdict)}`}>{x.sumber_skor === 'AI' ? 'AI ' : ''}{x.skor}%</span></td></tr>
          ))}</tbody>
        </table>
      )}
      <div className="hint" style={{ marginTop: 6 }}>Skor bertanda &quot;AI&quot; = draft, belum diputuskan HR.</div>
    </div>
  )
}

export default function Assistant() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Halo! Saya bisa bantu **pindah layar**, **membuka dan menilai CV** pakai draft AI, dan **membuat laporan** hasil screening. Ketik perintah atau pilih tombol di bawah.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('')
  // null = belum dicek; false = AI tidak aktif → hanya peringatan, tanpa aksi
  const [aiOn, setAiOn] = useState<boolean | null>(null)
  const [warning, setWarning] = useState('')
  const ctl = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [msgs, open])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const openPanel = async () => {
    setOpen(true)
    if (aiOn !== null) return
    const d = await fetch('/api/assistant', { credentials: 'include' }).then(r => r.json()).catch(() => null)
    setAiOn(!!d?.aiEnabled)
    setWarning(d?.warning || '')
    if (d?.aiEnabled) setMode('Dijawab AI (9router) · bisa menjalankan aksi di aplikasi')
  }

  const openCv = (id: string, applyAi: boolean) => {
    if (pathname === '/hr/cv') window.dispatchEvent(new CustomEvent('assistant-open-cv', { detail: { id, applyAi } }))
    else router.push(`/hr/cv?candidateId=${encodeURIComponent(id)}${applyAi ? '&applyAi=1' : ''}`)
  }
  const run = (a: Action) => {
    if (a.type === 'navigate') router.push(a.href)
    else if (a.type === 'open_cv') openCv(a.id, a.applyAi)
    else if (a.type === 'open_bulk') {
      if (pathname === '/hr/candidates') window.dispatchEvent(new CustomEvent('open-bulk-upload'))
      else { try { sessionStorage.setItem('open-bulk-upload', '1') } catch { /* abaikan */ } router.push('/hr/candidates') }
    }
  }

  const ask = async (q: string) => {
    q = q.trim()
    if (!q || busy) return
    const history = [...msgs, { role: 'user' as const, content: q }]
    setMsgs(history)
    setInput('')
    setBusy(true)
    ctl.current = new AbortController()
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: ctl.current.signal,
        body: JSON.stringify({
          messages: history.filter(m => !m.sys).map(m => ({ role: m.role, content: m.content })).slice(1),
          context: { path: pathname, candidateId: searchParams.get('candidateId') || undefined },
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsgs(m => [...m, { role: 'assistant', content: 'Maaf, gagal: ' + (d.error || res.status), sys: true }]); return }
      if (d.mode !== 'ai') {
        // Tanpa AI / AI error: tampilkan peringatan saja, jangan jalankan aksi apa pun
        if (d.mode === 'off') { setAiOn(false); setWarning(d.text) }
        setMsgs(m => [...m, { role: 'assistant', content: d.text, warn: true }])
        return
      }
      const actions = (d.actions || []) as Action[]
      const report = actions.find((a): a is Extract<Action, { type: 'report' }> => a.type === 'report')?.data
      setMsgs(m => [...m, { role: 'assistant', content: d.text || '', report }])
      // Jalankan aksi navigasi terakhir saja (laporan dirender di chat)
      const nav = actions.filter(a => a.type !== 'report')
      if (nav.length) run(nav[nav.length - 1])
    } catch (e) {
      const aborted = (e as Error).name === 'AbortError'
      setMsgs(m => [...m, { role: 'assistant', content: aborted ? 'Dihentikan.' : 'Koneksi terputus. Kirim ulang pertanyaannya.', sys: true }])
    } finally {
      setBusy(false)
      ctl.current = null
      inputRef.current?.focus()
    }
  }

  const close = () => { setOpen(false); setTimeout(() => fabRef.current?.focus(), 0) }

  return (
    <>
      {!open && (
        <button ref={fabRef} type="button" className="as-fab no-print" onClick={() => void openPanel()} aria-label="Buka Asisten Screening">
          <span className="dot"><IconSparkle size={15} /></span><span className="lbl">Asisten Screening</span>
        </button>
      )}
      {open && (
        <section className="as-panel no-print" aria-label="Asisten Screening" onKeyDown={e => { if (e.key === 'Escape') close() }}>
          <div className="as-head">
            <div className="dot"><IconSparkle size={16} /></div>
            <div><b>Asisten Screening</b><small>Navigasi, bantu nilai CV, dan laporan</small></div>
            <button type="button" className="x" onClick={close} aria-label="Tutup asisten"><IconX size={16} /></button>
          </div>
          {aiOn === false && (
            <div className="as-warning" role="alert"><IconAlert size={16} /><span>{warning}</span></div>
          )}
          <div className="as-log" ref={logRef} aria-live="polite">
            {msgs.map((m, i) => (
              <Fragment key={i}>
                <div className={`as-msg ${m.warn ? 'warn' : m.sys ? 'sys' : m.role === 'user' ? 'me' : 'bot'}`}>{m.warn && <IconAlert size={15} />}{m.role === 'user' ? m.content : <Md text={m.content} />}</div>
                {m.report && <ReportCard r={m.report} onOpen={id => openCv(id, false)} />}
              </Fragment>
            ))}
            {busy && <div className="as-msg bot"><span className="hint">Sedang berpikir…</span></div>}
          </div>
          <div className="as-chips">
            {CHIPS.map(([l, q]) => <button key={l} type="button" disabled={busy || aiOn === false} onClick={() => ask(q)}>{l}</button>)}
          </div>
          <form className="as-form" onSubmit={e => { e.preventDefault(); void ask(input) }}>
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} autoComplete="off" disabled={busy || aiOn === false}
              placeholder="Mis. buka CV Budi dan pakai skor AI" aria-label="Pesan untuk asisten" />
            {busy
              ? <button type="button" className="btn sm" onClick={() => ctl.current?.abort()}><IconStop size={14} />Stop</button>
              : <button type="submit" className="btn primary sm" aria-label="Kirim" disabled={aiOn === false}><IconSend size={14} /></button>}
          </form>
          <div className="as-mode">{aiOn === false ? 'Asisten nonaktif sampai AI dikonfigurasi.' : mode || 'Asisten hanya membantu navigasi dan ringkasan. Penilaian tetap disimpan oleh HR.'}</div>
        </section>
      )}
    </>
  )
}
