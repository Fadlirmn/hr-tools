'use client'

import { useEffect, useState } from 'react'
import { CV_ACCEPT, CV_FORMAT_HINT, CV_MAX_BYTES } from '@/lib/cv-file'
import { IconPaperclip } from './icons'

interface MyCvFile { filename: string; size: number; uploaded_at: string }

/** Kartu upload CV untuk kandidat (record miliknya sendiri). */
export default function CvUpload() {
  const [file, setFile] = useState<MyCvFile | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = async () => {
    const res = await fetch('/api/cv-screen', { credentials: 'include' })
    if (res.ok) setFile((await res.json()).file ?? null)
    setLoaded(true)
  }

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  const upload = async (f: File | undefined) => {
    if (!f) return
    setMsg(null)
    if (!consent) { setMsg({ ok: false, text: 'Centang persetujuan terlebih dahulu.' }); return }
    if (f.size > CV_MAX_BYTES) { setMsg({ ok: false, text: 'Ukuran file maksimal 5 MB.' }); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('consent', '1')
      const res = await fetch('/api/cv-file', { method: 'POST', credentials: 'include', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ ok: false, text: d.error || 'Upload gagal' }); return }
      setMsg({ ok: true, text: 'CV berhasil dikirim ke HR. Terima kasih!' })
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="profile-section">
      <h3><IconPaperclip size={16} /> Upload CV</h3>
      {file && (
        <div className="notice" style={{ marginBottom: 12 }}>
          ✅ CV terkirim: <b>{file.filename}</b> ({(file.size / 1024).toFixed(0)} KB) · {new Date(file.uploaded_at).toLocaleString('id-ID')}
        </div>
      )}
      <label className={`cv-drop${over ? ' over' : ''}`} style={{ display: 'block', opacity: busy ? 0.6 : 1 }}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); void upload(e.dataTransfer.files?.[0]) }}>
        <div style={{ fontWeight: 700 }}>{busy ? 'Mengupload…' : file ? 'Klik atau seret file untuk mengganti CV' : 'Klik atau seret file CV ke sini'}</div>
        <div className="hint" style={{ marginTop: 4 }}>{CV_FORMAT_HINT}</div>
        <input type="file" accept={CV_ACCEPT} style={{ display: 'none' }} disabled={busy}
          onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, fontSize: 13 }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
        <span>Saya menyetujui CV dan data pribadi saya diproses oleh tim HR, termasuk analisis berbantuan AI, untuk keperluan seleksi rekrutmen ini.</span>
      </label>
      {msg && <div className="hint" style={{ marginTop: 8, color: msg.ok ? 'var(--ok)' : 'var(--no)' }}>{msg.text}</div>}
    </div>
  )
}
