'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import { STAGES } from '@/lib/constants'
import { loadQuestions } from '@/lib/questions'
import { estimateIq, classifyIq } from '@/lib/iq-scoring'
import CvResult from '@/components/results/cv-result'
import DiscResult from '@/components/results/disc-result'
import IqResult from '@/components/results/iq-result'
import InterviewResult from '@/components/results/interview-result'
import OnboardingResult from '@/components/results/onboarding-result'
import type { Candidate, Position, IqQuestion, CvFileMeta } from '@/lib/types'
import { IconEdit, IconTrash, IconExternal } from '@/components/icons'
import { inviteCandidate } from '@/lib/invite-client'
import { ACCESS_LABEL, testStatus } from '@/lib/test-access'
import CandidateFormModal from '@/components/candidate-form-modal'
import HrCvDrop from '@/components/hr-cv-drop'

const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : v === 'Tidak Lolos' ? 'no' : 'neutral'

export default function HrCandidateDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [iqQuestions, setIqQuestions] = useState<IqQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<CvFileMeta | null>(null)
  const [editing, setEditing] = useState(false)

  const loadCandidate = useCallback(async () => {
    if (!id) return
    const cands = await fetchCandidates() as Candidate[]
    setCandidate(cands.find(c => c.id === id) || null)
  }, [id])

  const loadFile = useCallback(async () => {
    if (!id) return
    const res = await fetch(`/api/cv-screen?candidateId=${encodeURIComponent(id)}`, { credentials: 'include' })
    setFile(res.ok ? (await res.json()).file ?? null : null)
  }, [id])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [, pos, q] = await Promise.all([loadCandidate(), getPositions(), loadQuestions(), loadFile()])
      setPositions(pos)
      setIqQuestions(q.iq)
      setLoading(false)
    })()
  }, [id, loadCandidate, loadFile])

  // CV disimpan dari Asisten (chat) → muat ulang
  useEffect(() => {
    const onChange = () => { void loadFile(); void loadCandidate() }
    window.addEventListener('cv-data-changed', onChange)
    return () => window.removeEventListener('cv-data-changed', onChange)
  }, [loadFile, loadCandidate])

  // Perbarui selama AI masih menganalisis CV
  useEffect(() => {
    if (file?.ai_status !== 'processing') return
    const t = setInterval(() => { void loadFile() }, 3000)
    return () => clearInterval(t)
  }, [file?.ai_status, loadFile])

  if (loading) return <div className="hint">Memuat...</div>

  if (!candidate) {
    return (
      <div className="card card-p">
        <div className="empty">
          <div className="big">◦</div>
          <div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Kandidat tidak ditemukan</div>
          <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => router.push('/hr/candidates')}>← Kembali ke daftar</button>
        </div>
      </div>
    )
  }

  const c = candidate
  const posName = positions.find(p => p.id === c.posisi)?.name || '—'
  const disc = c.psikotes_result?.disc
  const iq = c.psikotes_result?.iq
  const iqScore = iq ? estimateIq(iq.percent) : null

  const removeCandidate = async () => {
    if (!confirm(`Hapus kandidat "${c.nama}" beserta seluruh penilaiannya?`)) return
    const res = await fetch('/api/delete-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ candidateId: c.id }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Gagal menghapus: ' + (d.error || res.status)); return }
    router.push('/hr/candidates')
  }

  const ai = file?.ai_status === 'done' ? file.ai_result : null

  const setStage = async (stage: string) => {
    const res = await fetch('/api/candidates', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ id: c.id, stage }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Gagal mengubah tahap: ' + (d.error || res.status)); return }
    await loadCandidate()
  }

  const invite = async () => { if (await inviteCandidate(c)) await loadCandidate() }
  const go = (path: string) => router.push(`${path}?candidateId=${encodeURIComponent(c.id)}`)

  const downloadPdf = () => {
    const prevTitle = document.title
    document.title = `Hasil Test - ${c.nama}`
    const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore) }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  return (
    <>
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 100%' }}>
            <button className="btn ghost sm no-print" style={{ marginBottom: 8 }} onClick={() => router.push('/hr/candidates')}>← Kembali</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 6px' }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, flex: 1, minWidth: 0 }}>{c.nama}</h2>
              <div className="no-print" style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn sm" onClick={() => setEditing(true)}><IconEdit size={14} />Edit</button>
                <button type="button" className="btn sm danger" onClick={removeCandidate}><IconTrash size={14} />Hapus</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`stagepill s-${c.stage} print-only`}>{STAGES[c.stage]}</span>
              <span className="hint">{posName}</span>
              <span className="hint">· Sumber: {c.sumber || '—'}</span>
              <span className="hint">· Masuk: {c.tanggal || '—'}</span>
            </div>
          </div>
        </div>

        {/* Proses: semua aksi untuk kandidat ini di satu tempat */}
        <div className="cand-process no-print">
          <div className="pitem">
            <label className="l" htmlFor="det-stage">Tahap</label>
            <select id="det-stage" value={c.stage} onChange={e => setStage(e.target.value)} className={`stage-select s-${c.stage}`}>
              {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="pitem">
            <span className="l">Akun kandidat</span>
            {c.user_id
              ? <span className="chip ok">Terdaftar</span>
              : <button type="button" className="btn sm" onClick={invite} title="Salin link undangan untuk membuat akun kandidat">{c.invite_token ? 'Kirim ulang undangan' : 'Undang'}</button>}
          </div>
          <div className="pitem">
            <span className="l">Tes online</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {(['disc', 'iq'] as const).map(t => {
                const st = ACCESS_LABEL[testStatus(c, t)]
                return <span key={t} className={`chip ${st.cls}`}>{t === 'disc' ? 'DISC' : 'IQ'}: {st.text}</span>
              })}
              <button type="button" className="btn sm" onClick={() => router.push(`/hr/akses-tes?highlight=${encodeURIComponent(c.id)}`)}>Atur akses</button>
            </div>
          </div>
          <div className="pitem wide">
            <span className="l">Lanjutkan proses</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn sm" onClick={() => go('/hr/cv')}>Nilai CV</button>
              <button type="button" className="btn sm" onClick={() => go('/hr/tes-disc')}>Tes DISC di PC HRD</button>
              <button type="button" className="btn sm" onClick={() => go('/hr/tes-iq')}>Tes IQ di PC HRD</button>
              <button type="button" className="btn sm" onClick={() => go('/hr/interview')}>Interview</button>
              <button type="button" className="btn sm" onClick={() => go('/hr/onboarding')}>Onboarding</button>
              <button type="button" className="btn primary sm" onClick={downloadPdf}>⬇ Download PDF</button>
            </div>
          </div>
        </div>

        <div className="detail-grid" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          <div className="item"><div className="l">Email</div><div className="v">{c.email || '—'}</div></div>
          <div className="item"><div className="l">Telepon</div><div className="v">{c.telepon || '—'}</div></div>
          <div className="item" style={{ gridColumn: '1 / -1' }}><div className="l">Catatan</div><div className="v" style={{ fontWeight: 500 }}>{c.catatan || '—'}</div></div>
        </div>
      </div>

      <div className="card card-p no-print" style={{ marginBottom: 16 }}>
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">CV</span><h3>Upload CV</h3>
          {file && <span className="meta">{file.filename} · {(file.size / 1024).toFixed(0)} KB</span>}
        </div>
        {file && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {ai ? <span className={`chip ${chipClass(ai.verdict)}`}>AI {ai.percent}% · {ai.verdict}</span>
              : file.ai_status === 'processing' ? <span className="hint" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span className="spinner" aria-hidden="true" />AI sedang menganalisis…</span>
              : file.ai_status === 'error' ? <span className="chip no" title={file.ai_error || ''}>Analisis AI gagal</span>
              : null}
            <span style={{ flex: 1 }} />
            <a className="btn sm" href={`/api/cv-file?candidateId=${encodeURIComponent(c.id)}&v=${file.uploaded_at}`} target="_blank" rel="noreferrer"><IconExternal size={14} />Buka</a>
            <button type="button" className="btn sm primary" onClick={() => router.push(`/hr/cv?candidateId=${c.id}`)}>Nilai CV</button>
          </div>
        )}
        {ai?.extracted.ringkasan && <p style={{ fontSize: 13.5, margin: '0 0 12px' }}>{ai.extracted.ringkasan}</p>}
        <HrCvDrop candidateId={c.id} currentFilename={file?.filename}
          onUploaded={async () => { await Promise.all([loadFile(), loadCandidate()]) }} />
      </div>

      <div className="card card-p summary-card">
        <h4 className="blk" style={{ margin: '0 0 12px' }}>Ringkasan</h4>
        <div className="summary-grid">
          <div className="item"><div className="l">CV</div><div className="v">{c.cv ? `${c.cv.percent}%` : '—'}</div><div className="s">{c.cv?.verdict || 'Belum dinilai'}</div></div>
          <div className="item"><div className="l">DISC</div><div className="v">{disc ? disc.adapted.pattern.type : '—'}</div><div className="s">{disc ? disc.adapted.pattern.name : 'Belum dites'}</div></div>
          <div className="item"><div className="l">IQ</div><div className="v">{iqScore != null ? `IQ ${iqScore}` : '—'}</div><div className="s">{iq && iqScore != null ? `${classifyIq(iqScore).label} · ${iq.percent}%` : 'Belum dites'}</div></div>
          <div className="item"><div className="l">Interview</div><div className="v">{c.interview ? c.interview.avg.toFixed(1) : '—'}</div><div className="s">{c.interview?.verdict || 'Belum dinilai'}</div></div>
          <div className="item"><div className="l">Onboarding</div><div className="v">{c.onboarding ? `${c.onboarding.progress}%` : '—'}</div><div className="s">{c.onboarding ? 'Progress' : 'Belum mulai'}</div></div>
        </div>
      </div>

      <CvResult cv={c.cv} posName={posName} emptyHint="Belum ada penilaian CV untuk kandidat ini." />
      <DiscResult disc={disc} nama={c.nama} showMeta emptyHint="Kandidat belum mengerjakan Tes DISC." />
      <IqResult iq={iq} showMeta detail questions={iqQuestions} emptyHint="Kandidat belum mengerjakan Tes IQ." />
      <InterviewResult interview={c.interview} emptyHint="Belum ada penilaian interview untuk kandidat ini." />
      <OnboardingResult onboarding={c.onboarding} emptyHint="Onboarding belum dimulai." />

      {editing && (
        <CandidateFormModal editing={c} positions={positions} onPositionsChange={setPositions}
          onClose={() => setEditing(false)} onSaved={loadCandidate} />
      )}
    </>
  )
}
