'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function HrProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [email, setEmail] = useState('')
  const [nama, setNama] = useState('')
  const [telepon, setTelepon] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        setNama(user.user_metadata?.nama || '')
        setTelepon(user.user_metadata?.telepon || '')
      }
      setLoading(false)
    })()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const { error } = await supabase.auth.updateUser({
      data: { nama, telepon },
    })
    setSaving(false)
    if (error) setMsg('Gagal menyimpan: ' + error.message)
    else setMsg('Profil berhasil diperbarui!')
  }

  if (loading) return <div className="hint">Memuat...</div>

  return (
    <div className="card card-p" style={{ maxWidth: 500 }}>
      <h3 style={{ marginTop: 0 }}>Profil Akun</h3>
      <div className="sub" style={{ margin: '0 0 20px' }}>Kelola data akun HR Anda.</div>
      {msg && (
        <div className={`chip ${msg.includes('Gagal') ? 'no' : 'ok'}`} style={{ marginBottom: 14, display: 'block', width: 'fit-content' }}>
          {msg}
        </div>
      )}
      <form onSubmit={handleSave}>
        <div className="field">
          <label className="fld">Email</label>
          <input type="email" value={email} disabled style={{ opacity: 0.6 }} />
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>Email tidak dapat diubah.</div>
        </div>
        <div className="field">
          <label className="fld">Nama lengkap</label>
          <input type="text" value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama Anda" />
        </div>
        <div className="field">
          <label className="fld">No. Telepon</label>
          <input type="tel" value={telepon} onChange={e => setTelepon(e.target.value)} placeholder="08xxxxxxxxxx" />
        </div>
        <button className="btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
      </form>
    </div>
  )
}
