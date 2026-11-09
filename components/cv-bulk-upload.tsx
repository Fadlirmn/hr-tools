'use client'

import { useState } from 'react'
import { CV_ACCEPT, CV_FORMAT_HINT, CV_MAX_BYTES } from '@/lib/cv-file'
import { SUMBER_OPTIONS } from '@/lib/constants'
import type { Position } from '@/lib/types'
import { IconUpload } from './icons'

type Item = { name: string; status: 'antri' | 'upload' | 'ok' | 'gagal'; msg?: string }

interface Props {
  positions: Position[]
  /** Posisi terkunci. Kosong = HR memilih sendiri lewat dropdown. */
  posisi?: string
  /** Pilihan awal dropdown posisi */
  defaultPosisi?: string
  /** Dipanggil setelah setiap file selesai (untuk refresh daftar) */
  onProgress?: () => void | Promise<void>
  onRunningChange?: (running: boolean) => void
}

/** Upload banyak CV sekaligus: tiap file menjadi satu kandidat baru, AI langsung menganalisis. */
export default function CvBulkUpload({ positions, posisi, defaultPosisi, onProgress, onRunningChange }: Props) {
  const [pickPos, setPickPos] = useState(defaultPosisi || positions[0]?.id || '')
  const [sumber, setSumber] = useState('Lainnya')
  const [files, setFiles] = useState<File[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const pos = posisi || pickPos || positions[0]?.id || ''

  const add = (list: FileList | File[] | null) => {
    if (running) return
    const fresh = Array.from(list || [])
    if (!fresh.length) return
    // `files` kosong setelah batch selesai → batch baru menggantikan daftar hasil lama
    const next = [...files, ...fresh]
    setFiles(next)
    setItems(next.map(f => ({
      name: f.name,
      status: f.size > CV_MAX_BYTES ? 'gagal' : 'antri',
      msg: f.size > CV_MAX_BYTES ? 'Lebih dari 5 MB' : undefined,
    })))
  }

  const setRun = (v: boolean) => { setRunning(v); onRunningChange?.(v) }

  const run = async () => {
    if (!pos || !files.length || running) return
    setRun(true)
    const update = (i: number, patch: Partial<Item>) => setItems(prev => prev.map((it, j) => j === i ? { ...it, ...patch } : it))
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (f.size > CV_MAX_BYTES) continue
        update(i, { status: 'upload' })
        const fd = new FormData()
        fd.append('file', f)
        fd.append('posisi', pos)
        fd.append('sumber', sumber)
        try {
          const res = await fetch('/api/cv-bulk', { method: 'POST', credentials: 'include', body: fd })
          const d = await res.json().catch(() => ({}))
          if (res.ok) update(i, { status: 'ok', msg: d.ai === 'processing' ? 'Tersimpan · AI menganalisis' : 'Tersimpan' })
          else update(i, { status: 'gagal', msg: d.error || String(res.status) })
        } catch {
          update(i, { status: 'gagal', msg: 'Koneksi gagal' })
        }
        await onProgress?.()
      }
    } finally {
      setFiles([]) // cegah upload ganda bila tombol diklik lagi
      setRun(false)
    }
  }

  const queued = files.filter(f => f.size <= CV_MAX_BYTES).length

  return (
    <div>
      <div className="grid2">
        {!posisi && (
          <div className="field"><label className="fld" htmlFor="bulk-pos">Posisi dilamar *</label>
            <select id="bulk-pos" value={pos} onChange={e => setPickPos(e.target.value)} disabled={running}>
              {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
        )}
        <div className="field"><label className="fld" htmlFor="bulk-src">Sumber</label>
          <select id="bulk-src" value={sumber} onChange={e => setSumber(e.target.value)} disabled={running}>
            {SUMBER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select></div>
      </div>

      <label className={`cv-drop${over ? ' over' : ''}`} style={{ display: 'block', opacity: running ? 0.6 : 1 }}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}>
        <div style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <IconUpload size={16} />Klik atau seret banyak file CV ke sini
        </div>
        <div className="hint" style={{ marginTop: 4 }}>Tiap file jadi satu kandidat baru. {CV_FORMAT_HINT}</div>
        <input type="file" multiple accept={CV_ACCEPT} style={{ display: 'none' }} disabled={running}
          onChange={e => { add(e.target.files); e.target.value = '' }} />
      </label>

      {items.length > 0 && (
        <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
              <span style={{ flex: '1 0 35%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.name}>{it.name}</span>
              <span className={`chip ${it.status === 'ok' ? 'ok' : it.status === 'gagal' ? 'no' : it.status === 'upload' ? 'hold' : 'neutral'}`} style={{ minWidth: 0 }}>
                {it.status === 'upload' ? 'Mengupload…' : it.msg || (it.status === 'antri' ? 'Antri' : it.status)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        {files.length > 0 && !running && <button type="button" className="btn sm" onClick={() => { setFiles([]); setItems([]) }}>Batal</button>}
        <button type="button" className="btn primary sm" disabled={running || queued === 0 || !pos} onClick={run}>
          {running ? 'Memproses…' : `Upload ${queued || ''} CV`}
        </button>
      </div>
    </div>
  )
}
