'use client'

import { useEffect, useState } from 'react'
import { CV_MAX_BYTES } from '@/lib/cv-file'
import type { CvFileMeta, Position } from '@/lib/types'
import { IconFile, IconFileCheck, IconUsers, IconX } from './icons'

export type CvTarget = 'new' | 'current'
export interface SavedCv { id: string; filename: string; isNew: boolean }

const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : v === 'Tidak Lolos' ? 'no' : 'neutral'

/**
 * Simpan CV dulu (sebagai file kandidat di database), baru dianalisis AI dari file tersimpan itu.
 * target 'new' → tiap file jadi kandidat baru di `posisi`; 'current' → ganti/isi CV kandidat `candidateId`.
 */
export async function saveCvs(files: File[], target: CvTarget, posisi: string, candidateId?: string):
  Promise<{ saved: SavedCv[]; failed: { filename: string; error: string }[] }> {
  const saved: SavedCv[] = []
  const failed: { filename: string; error: string }[] = []
  const list = target === 'current' ? files.slice(0, 1) : files
  for (const f of list) {
    if (f.size > CV_MAX_BYTES) { failed.push({ filename: f.name, error: 'Lebih dari 5 MB' }); continue }
    const fd = new FormData()
    fd.append('file', f)
    if (target === 'current' && candidateId) fd.append('candidateId', candidateId)
    else { fd.append('posisi', posisi); fd.append('sumber', 'Lainnya') }
    try {
      const res = await fetch(target === 'current' ? '/api/cv-file' : '/api/cv-bulk', { method: 'POST', credentials: 'include', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { failed.push({ filename: f.name, error: d.error || String(res.status) }); continue }
      saved.push({ id: target === 'current' ? candidateId! : d.candidateId, filename: d.filename || f.name, isNew: target !== 'current' })
    } catch {
      failed.push({ filename: f.name, error: 'Koneksi gagal' })
    }
  }
  if (saved.length) window.dispatchEvent(new CustomEvent('cv-data-changed'))
  return { saved, failed }
}

/** Lampiran yang menunggu dikirim + pilihan tujuan penyimpanan. */
export function AttachBar({ files, onRemove, target, onTarget, posisi, onPosisi, positions, currentName, disabled }: {
  files: File[]; onRemove: (i: number) => void
  target: CvTarget; onTarget: (t: CvTarget) => void
  posisi: string; onPosisi: (p: string) => void
  positions: Position[]; currentName: string | null; disabled: boolean
}) {
  if (!files.length) return null
  return (
    <div className="as-attach">
      <div className="files">
        {files.map((f, i) => (
          <span key={i} className="file" title={f.name}>
            <IconFile size={13} /><span className="nm">{f.name}</span>
            <button type="button" aria-label={`Hapus lampiran ${f.name}`} onClick={() => onRemove(i)} disabled={disabled}><IconX size={12} /></button>
          </span>
        ))}
      </div>
      <div className="opts">
        {currentName && (
          <select value={target} onChange={e => onTarget(e.target.value as CvTarget)} disabled={disabled} aria-label="Simpan CV ke">
            <option value="new">Kandidat baru</option>
            <option value="current">CV {currentName}</option>
          </select>
        )}
        {target === 'new' && (
          <select value={posisi} onChange={e => onPosisi(e.target.value)} disabled={disabled} aria-label="Posisi dilamar">
            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>
      <div className="hint">
        {target === 'current' ? 'CV kandidat ini diganti, lalu dianalisis AI.' : `${files.length} file disimpan sebagai kandidat baru, lalu dianalisis AI.`}
      </div>
    </div>
  )
}

/** Kartu hasil analisis untuk CV yang baru disimpan; memperbarui diri selama AI masih membaca. */
export function ChatCvCard({ cv, onReview, onDetail }: { cv: SavedCv; onReview: (id: string) => void; onDetail: (id: string) => void }) {
  const [file, setFile] = useState<CvFileMeta | null>(null)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let stop = false
    const load = async () => {
      const res = await fetch(`/api/cv-screen?candidateId=${encodeURIComponent(cv.id)}`, { credentials: 'include' }).catch(() => null)
      if (!res?.ok || stop) return
      const d = await res.json()
      setFile(d.file ?? null)
      setAiEnabled(!!d.aiEnabled)
      setTries(n => n + 1)
    }
    void load()
    return () => { stop = true }
  }, [cv.id])

  // Ulangi tiap 3 detik selama masih dianalisis (maks. ~5 menit)
  useEffect(() => {
    if (file?.ai_status !== 'processing' || tries > 100) return
    const t = setTimeout(async () => {
      const res = await fetch(`/api/cv-screen?candidateId=${encodeURIComponent(cv.id)}`, { credentials: 'include' }).catch(() => null)
      if (res?.ok) setFile((await res.json()).file ?? null)
      setTries(n => n + 1)
    }, 3000)
    return () => clearTimeout(t)
  }, [file, tries, cv.id])

  const ai = file?.ai_status === 'done' ? file.ai_result : null
  return (
    <div className="as-cv">
      <div className="top">
        <IconFile size={14} /><b title={cv.filename}>{ai?.extracted.nama || cv.filename}</b>
        {ai && <span className={`chip ${chipClass(ai.verdict)}`}>AI {ai.percent}% · {ai.verdict}</span>}
      </div>
      {!file ? <div className="hint">Memuat…</div>
        : file.ai_status === 'processing' ? <div className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className="spinner" aria-hidden="true" />CV tersimpan, AI sedang membaca…</div>
        : file.ai_status === 'error' ? <div className="hint" style={{ color: 'var(--no)' }}>CV tersimpan, tapi analisis gagal: {file.ai_error}</div>
        : !ai ? <div className="hint">CV tersimpan. {aiEnabled ? 'Analisis AI belum dijalankan.' : 'Analisis AI belum aktif (Admin → Pengaturan AI).'}</div>
        : (
          <>
            {ai.extracted.ringkasan && <p>{ai.extracted.ringkasan}</p>}
            <div className="hint">{[ai.extracted.pengalaman_tahun != null ? `${ai.extracted.pengalaman_tahun} th pengalaman` : '', ai.extracted.pendidikan_terakhir, ai.extracted.skills.slice(0, 5).join(', ')].filter(Boolean).join(' · ')}</div>
            {ai.strengths.length > 0 && <div className="pts"><b>Kekuatan:</b> {ai.strengths.slice(0, 2).join('; ')}</div>}
            {ai.concerns.length > 0 && <div className="pts"><b>Perlu digali:</b> {ai.concerns.slice(0, 2).join('; ')}</div>}
          </>
        )}
      <div className="acts">
        <button type="button" className="btn sm" onClick={() => onReview(cv.id)}><IconFileCheck size={13} />Nilai CV</button>
        <button type="button" className="btn sm" onClick={() => onDetail(cv.id)}><IconUsers size={13} />Detail</button>
      </div>
    </div>
  )
}
