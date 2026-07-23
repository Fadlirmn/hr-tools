'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'

interface AppUser {
  id: string
  email: string
  role: string
  nama: string
  created_at: string
  last_sign_in_at: string | null
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  dev:       { label: 'Dev',       color: 'var(--accent)' },
  hr:        { label: 'HR',        color: '#22c55e' },
  candidate: { label: 'Kandidat', color: '#f59e0b' },
  '':        { label: '—',        color: 'var(--ink-soft)' },
}

export default function UsersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [myRole, setMyRole] = useState<UserRole | ''>('')
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // userId being saved

  // Modal state
  const [modalUser, setModalUser] = useState<AppUser | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editNama, setEditNama] = useState('')

  // Check current user is dev
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const role = user?.user_metadata?.role as UserRole | ''
      setMyRole(role)
      if (role !== 'dev') {
        router.replace('/hr/dashboard')
        return
      }
      await load()
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/manage-user')
    if (res.ok) {
      const data = await res.json()
      // Sort: dev first, then hr, then others, then by email
      const order: Record<string, number> = { dev: 0, hr: 1, candidate: 2, '': 3 }
      data.users.sort((a: AppUser, b: AppUser) =>
        (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.email.localeCompare(b.email)
      )
      setUsers(data.users)
    }
    setLoading(false)
  }

  const openModal = (u: AppUser) => {
    setModalUser(u)
    setEditRole(u.role)
    setEditNama(u.nama)
  }

  const saveModal = async () => {
    if (!modalUser) return
    setSaving(modalUser.id)
    await fetch('/api/manage-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: modalUser.id, role: editRole, nama: editNama }),
    })
    setSaving(null)
    setModalUser(null)
    await load()
  }

  const deleteUser = async (u: AppUser) => {
    if (!confirm(`Hapus user "${u.email}"?\nAksi ini tidak bisa dibatalkan.`)) return
    setSaving(u.id)
    await fetch('/api/manage-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id }),
    })
    setSaving(null)
    await load()
  }

  const fmtDate = (s: string | null) => {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (myRole && myRole !== 'dev') return null // redirecting

  return (
    <>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
          {users.length} user terdaftar
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn sm" onClick={load} disabled={loading}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      <div className="card card-p">
        {loading ? (
          <div className="empty"><div className="hint">Memuat…</div></div>
        ) : users.length === 0 ? (
          <div className="empty"><div className="hint">Tidak ada user.</div></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Bergabung</th>
                <th>Login Terakhir</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS['']
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.email}</td>
                    <td>{u.nama || <span className="hint">—</span>}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: roleInfo.color + '22',
                        color: roleInfo.color,
                        border: `1px solid ${roleInfo.color}55`,
                      }}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="hint">{fmtDate(u.created_at)}</td>
                    <td className="hint">{fmtDate(u.last_sign_in_at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn sm ghost"
                        onClick={() => openModal(u)}
                        disabled={saving === u.id}
                      >
                        Edit
                      </button>
                      <button
                        className="btn sm danger"
                        onClick={() => deleteUser(u)}
                        disabled={saving === u.id}
                        style={{ marginLeft: 6 }}
                      >
                        {saving === u.id ? '…' : 'Hapus'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalUser && (
        <div className="modal-bg show" onClick={() => setModalUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit User</h3>
            <div className="body">
              <div className="field">
                <label className="fld">Email</label>
                <input type="text" value={modalUser.email} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="field">
                <label className="fld">Nama tampilan</label>
                <input
                  type="text"
                  value={editNama}
                  onChange={e => setEditNama(e.target.value)}
                  placeholder="cth. Budi Santoso"
                />
              </div>
              <div className="field">
                <label className="fld">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}>
                  <option value="hr">HR</option>
                  <option value="candidate">Kandidat</option>
                  <option value="dev">Dev</option>
                </select>
              </div>
              <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-soft)', fontSize: 11, color: 'var(--ink-soft)' }}>
                ℹ️ Perubahan role aktif setelah user login ulang.
              </div>
            </div>
            <div className="foot">
              <button className="btn" onClick={() => setModalUser(null)}>Batal</button>
              <button
                className="btn primary"
                onClick={saveModal}
                disabled={saving === modalUser.id}
              >
                {saving === modalUser.id ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
