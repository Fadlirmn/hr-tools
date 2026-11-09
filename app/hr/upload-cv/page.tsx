'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import type { Candidate, Position, CvFileMeta } from '@/lib/types'
import CandidatePicker from '@/components/candidate-picker'
import HrCvDrop from '@/components/hr-cv-drop'
import type { PickerItem } from '@/lib/candidate-filter'
import { IconArrowRight, IconExternal, IconFile } from '@/components/icons'

export default function HrUploadCvPage() {
  return (
    <Suspense fallback={<div className="hint">Memuat...</div>}>
      <UploadCvContent />
    </Suspense>
  )
}

function UploadCvContent() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selId, setSelId] = useState('')
  const [file, setFile] = useState<CvFileMeta | null>(null)
  const [justUploaded, setJustUploaded] = useState(false)

  const load = async () => {
    setCandidates(await fetchCandidates() as Candidate[])
    setPositions(await getPositions())
  }

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  const loadFile = async (id: string) => {
    if (!id) { setFile(null); return }
    const res = await fetch(`/api/cv-screen?candidateId=${encodeURIComponent(id)}`, { credentials: 'include' })
    setFile(res.ok ? (await res.json()).file ?? null : null)
  }

  useEffect(() => {
    ;(async () => { await loadFile(selId) })()
  }, [selId])

  const choose = (id: string) => { setSelId(id); setJustUploaded(false) }

  const c = candidates.find(x => x.id === selId) || null
  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'

  const pickerItems: PickerItem[] = candidates.map(x => ({
    id: x.id, nama: x.nama, posisi: posName(x.posisi),
    todo: !x.has_cv_file, done: !!x.has_cv_file, hasCv: !!x.has_cv_file,
  }))
  const nextNoCv = pickerItems.find(x => x.todo && x.id !== selId)

  const onUploaded = async () => {
    setJustUploaded(true)
    await Promise.all([loadFile(selId), load()])
  }

  return (
    <>
      <CandidatePicker items={pickerItems} value={selId} onChange={choose}
        labels={{ todo: 'Belum ada CV', done: 'Sudah ada CV' }} defaultFilter="todo" />

      {!c ? (
        <div className="card card-p">
          <div className="empty">
            <div className="big"><IconFile size={34} /></div>
            <div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Cari nama kandidat di atas</div>
            <div className="hint">Lalu seret file CV ke kotak upload.</div>
            <div className="hint" style={{ marginTop: 8 }}>
              Kandidat belum terdaftar? Tambah di <Link href="/hr/candidates">Daftar Kandidat</Link>, atau pakai Upload CV massal di sana untuk banyak CV sekaligus.
            </div>
          </div>
        </div>
      ) : (
        <div className="card card-p" style={{ maxWidth: 640 }}>
          <div className="section-head" style={{ marginTop: 0 }}>
            <span className="tag">CV</span><h3>{c.nama}</h3>
            <span className="meta">{posName(c.posisi)}</span>
          </div>

          {file && (
            <div className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ flex: '1 1 160px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.filename}>
                CV saat ini: <b>{file.filename}</b> · {(file.size / 1024).toFixed(0)} KB
              </span>
              <a className="btn sm" href={`/api/cv-file?candidateId=${encodeURIComponent(c.id)}&v=${file.uploaded_at}`} target="_blank" rel="noreferrer">
                <IconExternal size={14} />Buka
              </a>
            </div>
          )}

          <HrCvDrop candidateId={c.id} currentFilename={file?.filename} onUploaded={onUploaded} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {file && (
              <Link className={`btn sm${justUploaded ? ' primary' : ''}`} href={`/hr/cv?candidateId=${encodeURIComponent(c.id)}`}>
                Nilai CV<IconArrowRight size={14} />
              </Link>
            )}
            {nextNoCv && (
              <button type="button" className="btn sm" onClick={() => choose(nextNoCv.id)}>
                Berikutnya tanpa CV: {nextNoCv.nama}<IconArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
