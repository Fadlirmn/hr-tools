'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  dev:       { label: 'Developer', color: 'var(--accent)' },
  hr:        { label: 'HR',        color: '#22c55e' },
  candidate: { label: 'Kandidat', color: '#f59e0b' },
}

export default function HrProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  // Profile fields
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [nama, setNama] = useState('')         // Full name / display name
  const [username, setUsername] = useState('') // Short username / alias
  const [telepon, setTelepon] = useState('')

  // Password change fields
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        setRole((user.user_metadata?.role as UserRole) || '')
        setNama(user.user_metadata?.nama || '')
        setUsername(user.user_metadata?.username || '')
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
      data: { nama, username: username.trim(), telepon },
    })
    setSaving(false)
    if (error) setMsg('Gagal menyimpan: ' + error.message)
    else setMsg('Profil berhasil diperbarui!')
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg('')
    if (!pwNew || !pwConfirm) { setPwMsg('Isi semua kolom password.'); return }
    if (pwNew !== pwConfirm) { setPwMsg('Password baru tidak cocok.'); return }
    if (pwNew.length < 8) { setPwMsg('Password minimal 8 karakter.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwSaving(false)
    if (error) setPwMsg('Gagal: ' + error.message)
    else {
      setPwMsg('Password berhasil diubah!')
      setPwNew(''); setPwConfirm('')
    }
  }

  if (loading) return <div className="hint">Memuat...</div>

  const roleInfo = ROLE_LABEL[role] ?? { label: role || '—', color: 'var(--ink-soft)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>

      {/* Profile card */}
      <div className="card card-p">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0,
          }}>
            {(nama || email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{nama || email}</div>
            {username && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>@{username}</div>}
            <span style={{
              display: 'inline-block', marginTop: 4,
              padding: '1px 10px', borderRadius: 999,
              fontSize: 10.5, fontWeight: 700,
              background: roleInfo.color + '22',
              color: roleInfo.color,
              border: `1px solid ${roleInfo.color}55`,
            }}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        {msg && (
          <div className={`chip ${msg.includes('Gagal') ? 'no' : 'ok'}`}
            style={{ marginBottom: 14, display: 'block', width: 'fit-content' }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="field">
            <label className="fld">Email</label>
            <input type="email" value={email} disabled style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>Email tidak dapat diubah.</div>
          </div>
          <div className="grid2">
            <div className="field">
              <label className="fld">Nama lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={e => setNama(e.target.value)}
                placeholder="cth. Budi Santoso"
              />
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 }}>
                Ditampilkan di sidebar & header.
              </div>
            </div>
            <div className="field">
              <label className="fld">Username / alias</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  padding: '0 10px', height: 36, display: 'flex', alignItems: 'center',
                  background: 'var(--bg-soft)', border: '1px solid var(--line)',
                  borderRight: 'none', borderRadius: '8px 0 0 8px',
                  fontSize: 13, color: 'var(--ink-soft)', userSelect: 'none',
                }}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                  placeholder="budi.s"
                  style={{ borderRadius: '0 8px 8px 0', borderLeft: 'none', flex: 1 }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 }}>
                Huruf, angka, titik, garis bawah.
              </div>
            </div>
          </div>
          <div className="field">
            <label className="fld">No. Telepon</label>
            <input
              type="tel"
              value={telepon}
              onChange={e => setTelepon(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>
      </div>

      {/* Password change card */}
      <div className="card card-p">
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>Ubah Password</h3>
        <div className="sub" style={{ marginBottom: 16 }}>Gunakan password yang kuat dan unik.</div>

        {pwMsg && (
          <div className={`chip ${pwMsg.includes('Gagal') || pwMsg.includes('tidak') || pwMsg.includes('minimal') ? 'no' : 'ok'}`}
            style={{ marginBottom: 14, display: 'block', width: 'fit-content' }}>
            {pwMsg}
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div className="field">
            <label className="fld">Password baru</label>
            <input
              type="password"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              placeholder="Min. 8 karakter"
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label className="fld">Konfirmasi password baru</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
            />
          </div>
          <button className="btn" type="submit" disabled={pwSaving}>
            {pwSaving ? 'Mengubah...' : 'Ubah Password'}
          </button>
        </form>
      </div>

    </div>
  )
}
