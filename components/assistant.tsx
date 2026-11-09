'use client'

import { useEffect, useRef, useState, Fragment, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { IconSparkle, IconX, IconSend, IconStop, IconAlert, IconMaximize, IconMinimize, IconFileCheck, IconUsers, IconPaperclip } from './icons'
import { AttachBar, ChatCvCard, saveCvs, type CvTarget, type SavedCv } from './assistant-cv'
import { getPositions } from '@/lib/db'
import { CV_ACCEPT } from '@/lib/cv-file'
import type { Position } from '@/lib/types'

type Report = {
  title: string; generated_at: string; posisi: string | null; total: number; cv_masuk: number; dianalisis_ai: number
  perlu_dinilai: { id: string; nama: string }[]; verdict: Record<string, number>; sumber: Record<string, number>
  tahap: Record<string, number>; alasan_tidak_lanjut: Record<string, number>
  peringkat: { id: string; nama: string; posisi: string; skor: number; sumber_skor: 'HR' | 'AI'; verdict: string }[]
}
type Action = { type: 'navigate'; href: string } | { type: 'open_cv'; id: string; applyAi: boolean } | { type: 'open_bulk' } | { type: 'report'; data: Report }
type Mention = { id: string; nama: string; posisi: string }
// local: hanya tampilan (upload CV di chat), tidak dikirim sebagai riwayat ke AI
type Msg = { role: 'user' | 'assistant'; content: string; report?: Report; sys?: boolean; warn?: boolean; local?: boolean; mentions?: Mention[]; cvs?: SavedCv[] }

const CHIPS: [string, string][] = [
  ['Perlu dinilai', 'Siapa saja yang perlu saya nilai sekarang?'],
  ['Laporan screening', 'Buatkan laporan hasil screening hari ini'],
  ['Bandingkan Marketing', 'Bandingkan kandidat Marketing'],
  ['Upload CV', 'Buka menu upload CV'],
  ['Posisi & bobot', 'Buka pengaturan posisi dan bobot'],
]

const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : v === 'Tidak Lolos' ? 'no' : 'neutral'

/** Markdown minimal: **tebal**, bullet "- ", paragraf. Dirender sebagai elemen React (tanpa innerHTML). */
function Md({ text, mentions = [], onOpen }: { text: string; mentions?: Mention[]; onOpen?: (id: string) => void }) {
  // Nama lengkap kandidat yang disebut → tautan ke Review CV
  const names = mentions.filter(m => m.nama.length >= 3).sort((a, b) => b.nama.length - a.nama.length)
  const re = names.length ? new RegExp(`(${names.map(m => m.nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi') : null
  const link = (s: string, k: string) => !re || !onOpen ? s : s.split(re).map((part, i) => {
    const m = names.find(x => x.nama.toLowerCase() === part.toLowerCase())
    return m ? <button key={`${k}-${i}`} type="button" className="linkish" onClick={() => onOpen(m.id)} title={`Buka Review CV ${m.nama}`}>{part}</button> : <Fragment key={`${k}-${i}`}>{part}</Fragment>
  })
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <b key={i}>{link(p.slice(2, -2), 'b' + i)}</b> : <Fragment key={i}>{link(p, 't' + i)}</Fragment>)
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

function MentionLinks({ mentions, onReview, onList }: { mentions: Mention[]; onReview: (id: string) => void; onList: (id: string) => void }) {
  return (
    <div className="as-mentions" aria-label="Kandidat yang disebut">
      {mentions.map(m => (
        <div key={m.id} className="as-mention">
          <span className="nm">{m.nama}<small>{m.posisi}</small></span>
          <button type="button" className="btn sm" onClick={() => onReview(m.id)}><IconFileCheck size={13} />Review CV</button>
          <button type="button" className="btn sm" onClick={() => onList(m.id)}><IconUsers size={13} />Daftar</button>
        </div>
      ))}
    </div>
  )
}

function ReportCard({ r, onOpen, onList }: { r: Report; onOpen: (id: string) => void; onList: (id: string) => void }) {
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
            <tr key={x.id}><td><button type="button" className="linkish" onClick={() => onOpen(x.id)} title="Review CV">{x.nama}</button>
              {' '}<button type="button" className="linkish sub" onClick={() => onList(x.id)} title="Lihat di Daftar Kandidat">daftar</button></td><td>{x.posisi}</td>
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
  const [big, setBig] = useState(false)
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
  const msgsRef = useRef(msgs)
  useEffect(() => { msgsRef.current = msgs }, [msgs])

  // Lampiran CV: disimpan dulu sebagai file kandidat, baru dibaca AI
  const [files, setFiles] = useState<File[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [target, setTarget] = useState<CvTarget>('new')
  const [pickPos, setPickPos] = useState('')
  const [over, setOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const currentId = searchParams.get('candidateId') || /^\/hr\/candidates\/([^/]+)$/.exec(pathname)?.[1] || ''
  const urlPos = searchParams.get('posisi') || ''
  const posisi = positions.some(p => p.id === pickPos) ? pickPos
    : positions.some(p => p.id === urlPos) ? urlPos : positions[0]?.id || ''
  const cvTarget: CvTarget = target === 'current' && currentId ? 'current' : 'new'

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [msgs, open])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const openPanel = async () => {
    setOpen(true)
    if (!positions.length) void getPositions().then(setPositions).catch(() => {})
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
  const openList = (id: string) => {
    if (pathname === '/hr/candidates') window.dispatchEvent(new CustomEvent('highlight-candidate', { detail: { id } }))
    else router.push(`/hr/candidates?highlight=${encodeURIComponent(id)}`)
  }
  const run = (a: Action) => {
    if (a.type === 'navigate') router.push(a.href)
    else if (a.type === 'open_cv') openCv(a.id, a.applyAi)
    else if (a.type === 'open_bulk') router.push('/hr/upload-cv')
  }

  const addFiles = (list: FileList | File[] | null) => {
    const fresh = Array.from(list || [])
    if (fresh.length) setFiles(prev => [...prev, ...fresh].slice(0, 20))
  }

  const waitAnalyzed = async (ids: string[]) => {
    for (let i = 0; i < 40; i++) {
      const st = await Promise.all(ids.map(id =>
        fetch(`/api/cv-screen?candidateId=${encodeURIComponent(id)}`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null).then(d => d?.file?.ai_status as string | undefined).catch(() => undefined)))
      if (!st.includes('processing')) return
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  /** Simpan CV terlampir, tampilkan kartu analisis, lalu (bila ada teks) teruskan pertanyaan ke AI. */
  const sendFiles = async (q: string) => {
    const fs = files
    setFiles([])
    setInput('')
    setBusy(true)
    setMsgs(m => [...m, { role: 'user', content: `📎 ${fs.map(f => f.name).join(', ')}${q ? `\n${q}` : ''}`, local: true }])
    let uploaded: string[] = []
    try {
      if (cvTarget === 'new' && !posisi) {
        setMsgs(m => [...m, { role: 'assistant', content: 'Belum ada posisi. Tambahkan dulu di Posisi & Bobot.', sys: true }])
        return
      }
      const { saved, failed } = await saveCvs(fs, cvTarget, posisi, currentId)
      uploaded = saved.map(x => x.id)
      const posName = positions.find(p => p.id === posisi)?.name || ''
      const lines = [
        saved.length ? (cvTarget === 'current'
          ? `CV **${saved[0].filename}** disimpan ke kandidat ini, lalu dibaca AI.`
          : `**${saved.length} CV** disimpan sebagai kandidat baru (${posName}), lalu dibaca AI.`) : '',
        ...failed.map(f => `- Gagal: ${f.filename} — ${f.error}`),
      ].filter(Boolean)
      setMsgs(m => [...m, { role: 'assistant', content: lines.join('\n'), cvs: saved, local: true }])
      // Ada pertanyaan: tunggu AI selesai membaca CV yang tersimpan (maks. ~2 menit), baru dijawab
      if (q && uploaded.length && aiOn !== false) await waitAnalyzed(uploaded)
    } finally {
      setBusy(false)
    }
    if (q && aiOn !== false) await ask(q, { uploaded, showUser: false })
  }

  const ask = async (q: string, opts: { uploaded?: string[]; showUser?: boolean } = {}) => {
    q = q.trim()
    if (!q || busy) return
    const userMsg: Msg = { role: 'user', content: q }
    const history: Msg[] = [...msgsRef.current, userMsg]
    if (opts.showUser !== false) setMsgs(m => [...m, userMsg])
    setInput('')
    setBusy(true)
    ctl.current = new AbortController()
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: ctl.current.signal,
        body: JSON.stringify({
          messages: history.filter(m => !m.sys && !m.local).map(m => ({ role: m.role, content: m.content })).slice(1),
          context: { path: pathname, candidateId: currentId || undefined, uploaded: opts.uploaded },
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
      setMsgs(m => [...m, { role: 'assistant', content: d.text || '', report, mentions: d.mentions || [] }])
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
        <section className={`as-panel no-print${big ? ' big' : ''}${over ? ' drop' : ''}`} aria-label="Asisten Screening" onKeyDown={e => { if (e.key === 'Escape') close() }}
          onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true) } }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
          onDrop={e => { e.preventDefault(); setOver(false); if (!busy) addFiles(e.dataTransfer.files) }}>
          <div className="as-head">
            <div className="dot"><IconSparkle size={16} /></div>
            <div><b>Asisten Screening</b><small>Navigasi, bantu nilai CV, dan laporan</small></div>
            <button type="button" className="x" style={{ marginLeft: 'auto' }} onClick={() => setBig(v => !v)}
              aria-pressed={big} aria-label={big ? 'Perkecil jendela asisten' : 'Perbesar jendela asisten'} title={big ? 'Perkecil' : 'Perbesar'}>
              {big ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
            </button>
            <button type="button" className="x" style={{ marginLeft: 0 }} onClick={close} aria-label="Tutup asisten"><IconX size={16} /></button>
          </div>
          {aiOn === false && (
            <div className="as-warning" role="alert"><IconAlert size={16} /><span>{warning}</span></div>
          )}
          <div className="as-log" ref={logRef} aria-live="polite">
            {msgs.map((m, i) => (
              <Fragment key={i}>
                <div className={`as-msg ${m.warn ? 'warn' : m.sys ? 'sys' : m.role === 'user' ? 'me' : 'bot'}`}>{m.warn && <IconAlert size={15} />}{m.role === 'user' ? m.content : <Md text={m.content} mentions={m.mentions} onOpen={id => openCv(id, false)} />}</div>
                {m.report && <ReportCard r={m.report} onOpen={id => openCv(id, false)} onList={openList} />}
                {!!m.mentions?.length && <MentionLinks mentions={m.mentions} onReview={id => openCv(id, false)} onList={openList} />}
                {m.cvs?.map(cv => <ChatCvCard key={cv.id} cv={cv} onReview={id => openCv(id, false)} onDetail={id => router.push(`/hr/candidates/${id}`)} />)}
              </Fragment>
            ))}
            {busy && <div className="as-msg bot"><span className="hint">Sedang berpikir…</span></div>}
          </div>
          <div className="as-chips">
            {CHIPS.map(([l, q]) => <button key={l} type="button" disabled={busy || aiOn === false} onClick={() => ask(q)}>{l}</button>)}
          </div>
          <AttachBar files={files} onRemove={i => setFiles(f => f.filter((_, j) => j !== i))}
            target={cvTarget} onTarget={setTarget} posisi={posisi} onPosisi={setPickPos} positions={positions}
            currentName={currentId ? 'kandidat yang sedang dibuka' : null} disabled={busy} />
          <form className="as-form" onSubmit={e => { e.preventDefault(); if (files.length) void sendFiles(input.trim()); else void ask(input) }}>
            <button type="button" className="btn sm icon-btn" onClick={() => fileRef.current?.click()} disabled={busy}
              aria-label="Lampirkan CV" title="Lampirkan CV (PDF/JPG/PNG/WEBP)"><IconPaperclip size={15} /></button>
            <input ref={fileRef} type="file" multiple accept={CV_ACCEPT} hidden tabIndex={-1}
              onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} autoComplete="off" disabled={busy || (aiOn === false && !files.length)}
              placeholder={files.length ? 'Opsional: mis. analisis CV ini' : 'Mis. buka CV Budi dan pakai skor AI'} aria-label="Pesan untuk asisten" />
            {busy
              ? <button type="button" className="btn sm" onClick={() => ctl.current?.abort()}><IconStop size={14} />Stop</button>
              : <button type="submit" className="btn primary sm" aria-label="Kirim" disabled={aiOn === false && !files.length}><IconSend size={14} /></button>}
          </form>
          <div className="as-mode">{aiOn === false ? 'Asisten nonaktif sampai AI dikonfigurasi.' : mode || 'Asisten hanya membantu navigasi dan ringkasan. Penilaian tetap disimpan oleh HR.'}</div>
        </section>
      )}
    </>
  )
}
