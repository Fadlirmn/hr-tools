'use client'

import { useEffect, useRef, useState, Suspense, type KeyboardEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import type { Candidate, Position, CvScores, CvFileMeta, CvDecision, CvAssessment } from '@/lib/types'
import { CV_CRITERIA, CV_DECISIONS, CV_REJECT_REASONS, STAGES } from '@/lib/constants'
import { calcCvScore, defaultWeights, suggestDecision } from '@/lib/cv-score'
import { CV_ACCEPT, CV_FORMAT_HINT, CV_MAX_BYTES } from '@/lib/cv-file'
import CandidatePicker from '@/components/candidate-picker'
import type { PickerItem } from '@/lib/candidate-filter'
import {
  IconCheck, IconDownload, IconExternal, IconInfo, IconPlay,
  IconRefresh, IconSave, IconArrowRight, IconTrash, IconUpload, IconFile,
} from '@/components/icons'

export default function HrCvPage() {
  return (
    <Suspense fallback={<div className="hint">Memuat...</div>}>
      <HrCvContent />
    </Suspense>
  )
}

type MsgKind = 'info' | 'ok' | 'warn' | 'err'
const DEFAULT_MSG = 'Pilih keputusan, lalu Simpan.'

const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : v === 'Tidak Lolos' ? 'no' : 'neutral'
const verdictColor = (v: string) => v === 'Lolos' ? 'var(--ok)' : v === 'Pertimbangkan' ? 'var(--hold)' : v === 'Tidak Lolos' ? 'var(--no)' : 'var(--muted)'
const decisionLabel = (d: CvDecision | null) => CV_DECISIONS.find(x => x.id === d)?.label || ''

function HrCvContent() {
  const searchParams = useSearchParams()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState<string>('')
  const [scores, setScores] = useState<CvScores>({})
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState<CvDecision | null>(null)
  const [reason, setReason] = useState('')
  const [warned, setWarned] = useState(false) // klik Simpan pertama saat "Data belum cukup"
  const [msg, setMsg] = useState<{ text: string; kind: MsgKind }>({ text: DEFAULT_MSG, kind: 'info' })
  const [saving, setSaving] = useState(false)

  const [file, setFile] = useState<CvFileMeta | null>(null)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [fileVer, setFileVer] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const candidatesRef = useRef<Candidate[]>([])
  // Diminta Asisten Screening: isi form dengan skor AI begitu draft AI kandidat termuat
  const [pendingApply, setPendingApply] = useState(false)

  /** Isi form dari penilaian tersimpan (atau kosongkan) untuk kandidat `id`. */
  const openCandidate = (id: string, list: Candidate[], message?: { text: string; kind: MsgKind }) => {
    const cv = list.find(x => x.id === id)?.cv as CvAssessment | null | undefined
    setSelId(id)
    setPendingApply(false)
    setScores(cv ? { ...cv.scores } : {})
    setNotes(cv?.notes || '')
    setDecision(cv?.decision ?? null)
    setReason(cv?.reject_reason || '')
    setWarned(false)
    setMsg(message ?? (cv
      ? { text: `Sudah dinilai: ${cv.percent}% · ${cv.verdict}. Ubah nilai lalu Simpan untuk memperbarui.`, kind: 'info' }
      : { text: DEFAULT_MSG, kind: 'info' }))
  }

  const load = async () => {
    const list = await fetchCandidates() as Candidate[]
    candidatesRef.current = list
    setCandidates(list)
    setPositions(await getPositions())
    return list
  }

  useEffect(() => {
    ;(async () => {
      const list = await load()
      // Kandidat dari URL (?candidateId=) → langsung buka dengan penilaian tersimpan
      const id = searchParams.get('candidateId')
      if (id) {
        openCandidate(id, list)
        if (searchParams.get('applyAi') === '1') setPendingApply(true)
      }
    })()
    // Asisten membuka kandidat lain saat halaman ini sudah terbuka
    const onAssistant = (e: Event) => {
      const { id, applyAi } = (e as CustomEvent<{ id: string; applyAi: boolean }>).detail
      openCandidate(id, candidatesRef.current)
      setPendingApply(!!applyAi)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('assistant-open-cv', onAssistant)
    return () => window.removeEventListener('assistant-open-cv', onAssistant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadFile = async (id: string) => {
    if (!id) { setFile(null); return }
    const res = await fetch(`/api/cv-screen?candidateId=${encodeURIComponent(id)}`, { credentials: 'include' })
    if (!res.ok) { setFile(null); return }
    const d = await res.json()
    setFile(d.file ?? null)
    setAiEnabled(!!d.aiEnabled)
  }

  useEffect(() => {
    ;(async () => { await loadFile(selId) })()
  }, [selId])

  // Polling selama AI masih menganalisis
  useEffect(() => {
    if (file?.ai_status !== 'processing') return
    const t = setInterval(() => { void loadFile(selId) }, 3000)
    return () => clearInterval(t)
  }, [file?.ai_status, selId])

  const c = candidates.find(x => x.id === selId) || null
  const pos = c ? positions.find(p => p.id === c.posisi) : null
  const weights = (pos?.weights && Object.keys(pos.weights).length ? pos.weights : defaultWeights()) as unknown as Record<string, number>

  const r = calcCvScore(scores, weights)
  const insufficient = r.verdict === 'Data belum cukup'
  const suggestion = suggestDecision(r.verdict)
  const ai = file?.ai_status === 'done' ? file.ai_result : null
  const aiCalc = ai ? calcCvScore(ai.scores, weights) : null
  const aiById = new Map((ai?.criteria || []).map(x => [x.id, x]))

  const setScore = (id: string, n: number) => {
    setScores(prev => ({ ...prev, [id]: n }))
    setWarned(false)
  }

  const chooseDecision = (d: CvDecision) => {
    setDecision(d)
    if (d !== 'tolak') setReason('')
    setWarned(false)
    setMsg({ text: d === 'tolak' ? 'Pilih alasan tidak lanjut, lalu Simpan.' : 'Siap disimpan.', kind: 'info' })
  }

  const save = async (goNext: boolean) => {
    if (!c || saving) return
    if (!decision) { setMsg({ text: 'Pilih keputusan dulu: Lanjut Psikotes, Tahan, atau Tidak lanjut.', kind: 'err' }); return }
    if (decision === 'tolak' && !reason) { setMsg({ text: 'Pilih alasan tidak lanjut dulu.', kind: 'err' }); return }
    if (insufficient && !warned) {
      setWarned(true)
      setMsg({ text: `Baru ${r.filled}/${CV_CRITERIA.length} kriteria dinilai, datanya belum cukup. Klik sekali lagi untuk tetap menyimpan.`, kind: 'warn' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/cv-assessment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ candidateId: c.id, scores, decision, reject_reason: decision === 'tolak' ? reason : null, notes, confirmIncomplete: warned }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ text: 'Gagal menyimpan: ' + (d.error || res.status), kind: 'err' }); return }

      const saved = d.assessment as CvAssessment
      const stageTxt = d.stage !== d.stageBefore
        ? `Tahap kandidat → ${STAGES[d.stage] || d.stage}.`
        : `Tahap kandidat tetap ${STAGES[d.stage] || d.stage}.`
      const done = `Tersimpan: ${saved.percent}% · ${saved.verdict}. ${stageTxt}`
      const list = await load()

      if (!goNext) { openCandidate(c.id, list, { text: done, kind: 'ok' }); return }
      const next = d.next as { id: string; nama: string } | null
      if (!next) { openCandidate(c.id, list, { text: `${done} Tidak ada lagi CV yang perlu dinilai.`, kind: 'ok' }); return }
      openCandidate(next.id, list, { text: `${done} Dibuka: ${next.nama}.`, kind: 'ok' })
      window.scrollTo({ top: 0 })
      document.querySelector<HTMLInputElement>('.picker input')?.focus({ preventScroll: true })
    } finally {
      setSaving(false)
    }
  }

  const applyAi = (force = false) => {
    if (!ai) return
    if (!force && Object.keys(scores).length > 0 && !confirm('Ganti skor yang sudah diisi dengan draft AI?')) return
    setScores({ ...ai.scores })
    setWarned(false)
    const parts = [
      ai.extracted.ringkasan && `Ringkasan: ${ai.extracted.ringkasan}`,
      ai.strengths.length && `Kekuatan: ${ai.strengths.join('; ')}`,
      ai.concerns.length && `Perlu digali: ${ai.concerns.join('; ')}`,
    ].filter(Boolean)
    if (!notes.trim()) setNotes(parts.join('\n'))
    const empty = CV_CRITERIA.filter(cr => ai.scores[cr.id] == null).map(cr => `"${cr.name}"`)
    setMsg({
      text: 'Skor AI dipakai (belum disimpan).' + (empty.length ? ` Isi ${empty.join(', ')} setelah ditanya ke kandidat.` : ''),
      kind: 'info',
    })
  }

  // Permintaan "pakai skor AI" dari asisten: jalankan saat file kandidat yang benar sudah termuat
  if (pendingApply && file?.candidate_id === selId && file.ai_status !== 'processing') {
    setPendingApply(false)
    if (ai) applyAi(true)
    else setMsg({ text: 'Draft AI untuk kandidat ini belum tersedia, nilai secara manual.', kind: 'warn' })
  }

  const upload = async (f: File | undefined) => {
    if (!f || !c) return
    if (f.size > CV_MAX_BYTES) { alert('Ukuran file maksimal 5 MB'); return }
    if (file && !confirm(`Ganti CV "${file.filename}" dengan "${f.name}"?`)) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('candidateId', c.id)
      const res = await fetch('/api/cv-file', { method: 'POST', credentials: 'include', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert('Gagal upload: ' + (d.error || res.status)); return }
      setFileVer(v => v + 1)
      await loadFile(c.id)
      await load()
    } finally {
      setUploading(false)
    }
  }

  const reanalyze = async () => {
    if (!c) return
    const res = await fetch('/api/cv-screen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ candidateId: c.id }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Gagal: ' + (d.error || res.status)); return }
    await loadFile(c.id)
  }

  const removeFile = async () => {
    if (!c || !file) return
    if (!confirm(`Hapus file CV "${file.filename}" beserta hasil analisis AI-nya?`)) return
    await fetch(`/api/cv-file?candidateId=${encodeURIComponent(c.id)}`, { method: 'DELETE', credentials: 'include' })
    await loadFile(c.id)
    await load()
  }

  const pickerItems: PickerItem[] = candidates.map(x => ({
    id: x.id, nama: x.nama, posisi: positions.find(p => p.id === x.posisi)?.name || '—',
    todo: !!x.has_cv_file && !x.cv, done: !!x.cv, hasCv: !!x.has_cv_file,
    score: x.cv ? `${x.cv.percent}%` : x.ai_percent != null ? `AI ${x.ai_percent}%` : null,
    scoreKind: x.cv ? chipClass(x.cv.verdict) as PickerItem['scoreKind'] : 'neutral',
  }))

  const fileUrl = c ? `/api/cv-file?candidateId=${encodeURIComponent(c.id)}&v=${fileVer}-${file?.uploaded_at || ''}` : ''
  const C = 2 * Math.PI * 54

  return (
    <>
      <CandidatePicker items={pickerItems} value={selId} onChange={id => openCandidate(id, candidates)}
        labels={{ todo: 'Perlu dinilai', done: 'Sudah dinilai' }} defaultFilter="todo" />

      {!c ? (
        <div className="card card-p">
          <div className="empty"><div className="big"><IconFile size={34} /></div><div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Cari dan pilih kandidat di atas</div><div className="hint">CV, draft AI, dan form penilaian akan tampil di sini.</div></div>
        </div>
      ) : (
        <div className="cv-split">
          {/* ===== Kiri: preview CV ===== */}
          <div className="card card-p cv-preview no-print">
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="tag">File</span><h3>CV Kandidat</h3>
            </div>
            {file ? (
              <>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                  <span className="hint" style={{ flex: '1 1 120px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.filename}>
                    {file.filename} · {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <a className="btn sm" href={fileUrl} target="_blank" rel="noreferrer"><IconExternal size={14} />Buka</a>
                  <a className="btn sm" href={`${fileUrl}&download=1`}><IconDownload size={14} />Unduh</a>
                  <button type="button" className="btn sm danger" onClick={removeFile}><IconTrash size={14} />Hapus</button>
                </div>
                {file.mime === 'application/pdf' ? (
                  <iframe src={fileUrl} title={`Preview CV ${c.nama}`} className="cv-frame" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl} alt={`CV ${c.nama}`} className="cv-frame" style={{ objectFit: 'contain' }} />
                )}
              </>
            ) : (
              <div className="empty"><div className="big"><IconFile size={34} /></div><div style={{ fontWeight: 700 }}>CV belum diupload</div><div className="hint">{CV_FORMAT_HINT}</div></div>
            )}
            <button type="button" className="btn primary sm" style={{ marginTop: 12 }} disabled={uploading} onClick={() => fileInput.current?.click()}>
              <IconUpload size={14} />{uploading ? 'Mengupload…' : file ? 'Ganti CV' : 'Upload CV'}
            </button>
            <input ref={fileInput} type="file" accept={CV_ACCEPT} hidden tabIndex={-1}
              onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
          </div>

          {/* ===== Kanan ===== */}
          <div style={{ minWidth: 0 }}>
            {/* 1. Ringkasan skor (sticky) */}
            <div className="cv-sumbar no-print">
              <div className="sum-score">
                <b className={insufficient ? 'dim' : ''}>{r.percent}%</b>
                <span className={`chip ${chipClass(r.verdict)}`}>{r.verdict}</span>
              </div>
              <div className="sum-meta">{r.filled}/{CV_CRITERIA.length} dinilai · minimum {r.floor}%</div>
              <div className="sum-actions">
                <button type="button" className="btn sm" onClick={() => save(false)} disabled={saving}><IconSave size={14} />Simpan</button>
                <button type="button" className="btn primary sm" onClick={() => save(true)} disabled={saving}>Simpan &amp; berikutnya<IconArrowRight size={14} /></button>
              </div>
              <div className={`sum-msg ${msg.kind}`} role="status" aria-live="polite">{saving ? 'Menyimpan…' : msg.text}</div>
            </div>

            {/* 2. Draft screening AI */}
            {file && (
              <div className="card card-p no-print" style={{ marginBottom: 16 }}>
                <div className="section-head" style={{ marginTop: 0, flexWrap: 'wrap' }}>
                  <span className="tag">AI</span><h3>Draft Screening Otomatis</h3>
                  {ai && <span className="meta">{new Date(ai.analyzed_at).toLocaleString('id-ID')} · {ai.model}</span>}
                </div>
                {file.ai_status === 'processing' ? (
                  <div className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true" />Sedang menganalisis CV… (biasanya kurang dari 1 menit)</div>
                ) : file.ai_status === 'error' ? (
                  <div>
                    <div className="hint" style={{ color: 'var(--no)' }}>Analisis gagal: {file.ai_error}</div>
                    {aiEnabled && <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={reanalyze}><IconRefresh size={14} />Coba lagi</button>}
                  </div>
                ) : !ai || !aiCalc ? (
                  aiEnabled
                    ? <button type="button" className="btn sm" onClick={reanalyze}><IconPlay size={14} />Analisis CV</button>
                    : <div className="hint">Screening otomatis belum aktif (set CV_AI_BASE_URL + CV_AI_MODEL untuk 9router, atau ANTHROPIC_API_KEY, di server). Nilai CV secara manual.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`chip ${chipClass(aiCalc.verdict)}`} style={{ fontSize: 13, padding: '6px 14px' }}>AI: {aiCalc.percent}% · {aiCalc.verdict}</span>
                      <span className="hint">{aiCalc.filled}/{CV_CRITERIA.length} kriteria bisa dinilai dari CV · minimum {aiCalc.floor}%</span>
                      <span style={{ flex: 1 }} />
                      <button type="button" className="btn sm primary" onClick={() => applyAi()}>Pakai skor AI</button>
                      {aiEnabled && <button type="button" className="btn sm" onClick={reanalyze}><IconRefresh size={14} />Analisis ulang</button>}
                    </div>
                    <details key={c.id} className="ai-more" open={!c.cv}>
                    <summary>Ringkasan, kekuatan &amp; pertanyaan interview</summary>
                    {ai.extracted.ringkasan && <p style={{ fontSize: 13.5, margin: '10px 0 0' }}>{ai.extracted.ringkasan}</p>}
                    <div className="hint" style={{ marginTop: 6 }}>
                      {[ai.extracted.pendidikan_terakhir, ai.extracted.pengalaman_tahun != null ? `${ai.extracted.pengalaman_tahun} th pengalaman` : '', ai.extracted.skills.slice(0, 8).join(', ')].filter(Boolean).join(' · ')}
                    </div>
                    <div className="cv-ai-cols">
                      {ai.strengths.length > 0 && <div><b>Kekuatan</b><ul>{ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                      {ai.concerns.length > 0 && <div><b>Perlu digali</b><ul>{ai.concerns.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                    </div>
                    {ai.interview_questions.length > 0 && (
                      <div style={{ marginTop: 10, fontSize: 13 }}><b style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Saran pertanyaan interview</b>
                        <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>{ai.interview_questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
                      </div>
                    )}
                    </details>
                    <div className="hint" style={{ marginTop: 8 }}>Draft dibuat oleh AI dan bisa keliru. Cek bukti tiap kriteria sebelum menyimpan.</div>
                  </>
                )}
              </div>
            )}

            <div className="card card-p">
              <div className="section-head" style={{ marginTop: 0 }}>
                <span className="tag">CV</span><h3>Form Penilaian CV / Resume</h3>
                <span className="meta">{pos ? pos.name : 'posisi umum'}</span>
              </div>

              <div className="notice" style={{ marginBottom: 12 }}>
                <IconInfo size={16} style={{ marginTop: 1, color: 'var(--violet)' }} />
                <div>Nilai tiap kriteria <b>1–5</b>; bobot mengikuti posisi. Garis putus-putus oranye = saran AI (hanya draft), oranye penuh = nilai pilihanmu. Kriteria &quot;tidak ada info&quot; tidak menurunkan skor. Tahap kandidat hanya berubah saat kamu klik Simpan.</div>
              </div>
              <div className="cv-legend" aria-hidden="true">
                <span><i className="ai" />Saran AI</span><span><i className="on" />Nilai pilihanmu</span>
              </div>

              {/* 3. Form 10 kriteria */}
              {CV_CRITERIA.map(cr => {
                const a = aiById.get(cr.id)
                return (
                  <div className="crit" key={cr.id}>
                    <div className="top">
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <div className="name" id={`crit-${cr.id}`}>{cr.name} <span className="w">bobot {weights[cr.id] || 1}</span>
                          {a && <span className={`chip ${a.score == null ? 'neutral' : a.score >= 4 ? 'ok' : a.score >= 3 ? 'hold' : 'no'}`} style={{ marginLeft: 6, fontSize: 11 }}>AI: {a.score ?? 'tidak ada info'}</span>}
                        </div>
                        <div className="desc">{cr.desc}</div>
                        {a && (
                          <div className="cv-ai-evidence">
                            {a.evidence && <div style={{ fontStyle: 'italic' }}>“{a.evidence}”</div>}
                            <div>{a.reason}</div>
                          </div>
                        )}
                      </div>
                      <RateGroup labelId={`crit-${cr.id}`} label={cr.name} value={scores[cr.id] || 0}
                        ai={a?.score ?? null} onChange={n => setScore(cr.id, n)} />
                    </div>
                  </div>
                )
              })}

              {/* 4. Scorecard */}
              <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
                <div className="scorecard">
                  <div className="gauge">
                    <svg width="128" height="128" aria-hidden="true">
                      <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                      <circle cx="64" cy="64" r="54" fill="none" stroke={verdictColor(r.verdict)} strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={C} strokeDashoffset={C * (1 - r.percent / 100)} />
                    </svg>
                    <div className="val"><b style={insufficient ? { color: 'var(--muted)' } : undefined}>{r.percent}%</b><span>yang dinilai</span></div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <span className={`chip ${chipClass(r.verdict)}`} style={{ fontSize: 13, padding: '6px 14px' }}>{r.verdict}</span>
                    <div className="seg"><span className="lbl">Poin dari kriteria yang dinilai</span><b>{r.got} / {r.maxFilled}</b></div>
                    <div className="seg"><span className="lbl">Skor minimum (sisanya dianggap 0)</span><b>{r.floor}%</b></div>
                    <div className="seg"><span className="lbl">Kriteria dinilai</span><b>{r.filled}/{CV_CRITERIA.length}</b></div>
                    {aiCalc && <div className="hint" style={{ marginTop: 6 }}>Draft AI: {aiCalc.percent}%. Skor HR dan AI disimpan terpisah untuk audit.</div>}
                  </div>
                </div>
              </div>

              {/* 5. Keputusan */}
              <div style={{ marginTop: 18 }} className="no-print">
                <div id="cv-dec-lbl" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}>Keputusan</div>
                <div className="cv-decision" role="group" aria-labelledby="cv-dec-lbl">
                  {CV_DECISIONS.map(d => (
                    <button key={d.id} type="button" data-d={d.id} aria-pressed={decision === d.id} onClick={() => chooseDecision(d.id)}>
                      <IconCheck size={14} />{d.label}
                    </button>
                  ))}
                </div>
                {decision === 'tolak' && (
                  <div style={{ marginTop: 10 }}>
                    <label className="fld" htmlFor="cv-reason">Alasan tidak lanjut</label>
                    <select id="cv-reason" value={reason} onChange={e => { setReason(e.target.value); setWarned(false) }}>
                      <option value="">Pilih alasan…</option>
                      {CV_REJECT_REASONS.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="hint" style={{ marginTop: 8 }}>
                  {suggestion
                    ? `Saran dari skor: ${decisionLabel(suggestion)}. Keputusan tetap di kamu, bukan di AI.`
                    : 'Nilai lebih banyak kriteria, atau tanyakan ke kandidat, untuk mendapat saran.'}
                </div>
              </div>

              {/* 6. Catatan */}
              <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
                <label className="fld" htmlFor="cv-notes">Catatan penilai</label>
                <textarea id="cv-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Kekuatan, kelemahan, hal yang perlu digali saat interview..."></textarea>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Skala 1–5 sebagai radiogroup: roving tabindex, panah kiri/kanan (atau atas/bawah), Home/End. */
function RateGroup({ labelId, label, value, ai, onChange }: {
  labelId: string; label: string; value: number; ai: number | null; onChange: (n: number) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const focusIdx = value || ai || 1

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let n = 0
    // Belum ada nilai: panah pertama memilih tombol yang sedang fokus (saran AI atau 1)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = value ? Math.min(5, value + 1) : focusIdx
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = value ? Math.max(1, value - 1) : focusIdx
    else if (e.key === 'Home') n = 1
    else if (e.key === 'End') n = 5
    else return
    e.preventDefault()
    onChange(n)
    refs.current[n - 1]?.focus()
  }

  return (
    <div className="rate scale" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKey}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} ref={el => { refs.current[n - 1] = el }} type="button" role="radio"
          aria-checked={value === n} tabIndex={n === focusIdx ? 0 : -1}
          className={`${value === n ? 'on' : ''} ${ai === n ? 'ai' : ''}`.trim() || undefined}
          aria-label={`${label} nilai ${n}${ai === n ? ' (saran AI)' : ''}`}
          title={ai === n ? 'Saran AI' : undefined}
          onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  )
}
