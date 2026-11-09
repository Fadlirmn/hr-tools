'use client'

import { useEffect, useRef, useState } from 'react'
import { CV_ACCEPT, CV_FORMAT_HINT, CV_MAX_BYTES } from '@/lib/cv-file'
import { IconUpload } from './icons'

interface Props {
  candidateId: string
  /** Nama file CV yang sudah ada (untuk konfirmasi ganti) */
  currentFilename?: string | null
  onUploaded: (res: { filename: string; ai: 'processing' | 'none' }) => void | Promise<void>
  compact?: boolean
}

/** Zona upload CV untuk satu kandidat (HR): klik, seret file, atau tempel (Ctrl+V). */
export default function HrCvDrop({ candidateId, currentFilename, onUploaded, compact }: Props) {
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msgState, setMsgState] = useState<{ id: string; ok: boolean; text: string } | null>(null)
  // Pesan hanya untuk kandidat yang sedang tampil
  const msg = msgState?.id === candidateId ? msgState : null
  const setMsg = (m: { ok: boolean; text: string } | null) => setMsgState(m && { id: candidateId, ...m })
  const busyRef = useRef(false)

  const upload = async (f: File | null | undefined) => {
    if (!f || busyRef.current) return
    setMsg(null)
    if (f.size > CV_MAX_BYTES) { setMsg({ ok: false, text: `Ukuran file maksimal 5 MB (file ini ${(f.size / 1024 / 1024).toFixed(1)} MB).` }); return }
    if (currentFilename && !confirm(`Ganti CV "${currentFilename}" dengan "${f.name}"?`)) return
    busyRef.current = true
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('candidateId', candidateId)
      const res = await fetch('/api/cv-file', { method: 'POST', credentials: 'include', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ ok: false, text: 'Gagal upload: ' + (d.error || res.status) }); return }
      setMsg({ ok: true, text: `Tersimpan: ${d.filename || f.name}${d.ai === 'processing' ? ' · AI menganalisis' : ''}` })
      await onUploaded({ filename: d.filename || f.name, ai: d.ai === 'processing' ? 'processing' : 'none' })
    } catch {
      setMsg({ ok: false, text: 'Koneksi gagal, coba lagi.' })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // Tempel file/gambar dari clipboard (kecuali saat mengetik di input/textarea)
  const uploadRef = useRef(upload)
  useEffect(() => { uploadRef.current = upload })
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const f = Array.from(e.clipboardData?.files || [])[0]
      if (!f) return
      e.preventDefault()
      void uploadRef.current(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  return (
    <div>
      <label className={`cv-drop${over ? ' over' : ''}`}
        style={{ display: 'block', opacity: busy ? 0.6 : 1, padding: compact ? 14 : undefined }}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); void upload(e.dataTransfer.files?.[0]) }}>
        <div style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <IconUpload size={16} />
          {busy ? 'Mengupload…' : currentFilename ? 'Klik atau seret file untuk mengganti CV' : 'Klik atau seret file CV ke sini'}
        </div>
        <div className="hint" style={{ marginTop: 4 }}>{CV_FORMAT_HINT} Bisa juga tempel (Ctrl+V).</div>
        <input type="file" accept={CV_ACCEPT} style={{ display: 'none' }} disabled={busy}
          onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      {msg && <div className="hint" role="status" style={{ marginTop: 8, color: msg.ok ? 'var(--ok)' : 'var(--no)' }}>{msg.text}</div>}
    </div>
  )
}
