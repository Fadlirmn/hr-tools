'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import { isValidPhone, PHONE_ERROR, PHONE_HINT } from '@/lib/phone'

export default function CandidateProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [candidateId, setCandidateId] = useState('')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [telepon, setTelepon] = useState('')
  const [posisi, setPosisi] = useState('')

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (user) {
        const c = await getCandidateByUserId(user.id)
        if (c) {
          setCandidateId(c.id)
          setNama(c.nama)
          setEmail(c.email)
          setTelepon(c.telepon)
          setPosisi(c.posisi)
        }
      }
      setLoading(false)
    })()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateId) return
    if (!isValidPhone(telepon)) { setMsg(PHONE_ERROR); return }
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/candidates/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nama, email, telepon }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMsg('Gagal menyimpan.' + (d.error ? ' ' + d.error : ''))
    }
    else setMsg('Profil berhasil diperbarui!')
  }

  if (loading) return <div className="hint">Memuat...</div>

  return (
    <div className="card card-p" style={{ maxWidth: 500 }}>
      <h3 style={{ marginTop: 0 }}>Profil Saya</h3>
      <div className="sub" style={{ margin: '0 0 20px' }}>Kelola data diri Anda.</div>
      {msg && (
        <div className={`chip ${msg.includes('Gagal') ? 'no' : 'ok'}`} style={{ marginBottom: 14, display: 'block', width: 'fit-content' }}>
          {msg}
        </div>
      )}
      <form onSubmit={handleSave}>
        <div className="field">
          <label className="fld">Nama lengkap</label>
          <input type="text" value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama Anda" />
        </div>
        <div className="field">
          <label className="fld">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@contoh.com" />
        </div>
        <div className="field">
          <label className="fld">No. Telepon</label>
          <input type="tel" inputMode="tel" value={telepon} onChange={e => setTelepon(e.target.value)} placeholder="08xxxxxxxxxx" />
          <div className="hint" style={{ marginTop: 4 }}>{PHONE_HINT}</div>
        </div>
        <div className="field">
          <label className="fld">Posisi dilamar</label>
          <input type="text" value={posisi} disabled style={{ opacity: 0.6 }} />
        </div>
        <button className="btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
      </form>
    </div>
  )
}
