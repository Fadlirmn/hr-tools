'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPositions } from '@/lib/db'
import type { Candidate, Position } from '@/lib/types'
import { STAGES, rejectReasonLabel } from '@/lib/constants'
import { IconPaperclip, IconEye, IconEdit, IconTrash } from '@/components/icons'
import { inviteCandidate } from '@/lib/invite-client'
import CandidateFormModal from '@/components/candidate-form-modal'



export default function HrCandidatesPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  // Ref agar event listener (didaftar sekali) selalu baca positions terbaru
  const positionsRef = useRef<Position[]>([])
  useEffect(() => { positionsRef.current = positions }, [positions])

  // Modal tambah/edit: null = tertutup, 'new' = kandidat baru, selain itu kandidat yang diedit
  const [modal, setModal] = useState<'new' | Candidate | null>(null)

  // Baris yang disorot (dibuka dari Asisten Screening: ?highlight=<id>)
  const [hl, setHl] = useState('')

  const load = async () => {
    const res = await fetch('/api/candidates', { credentials: 'include' })
    const cData = res.ok ? await res.json() : { candidates: [] }
    setCandidates((cData.candidates || []) as Candidate[])
    const pos = await getPositions()
    setPositions(pos)
    return pos
  }


  const focusRow = (id: string) => {
    setHl(id)
    // tunggu baris ter-render, lalu gulir & fokuskan
    setTimeout(() => {
      const row = document.getElementById(`cand-row-${id}`)
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      row?.querySelector<HTMLButtonElement>('.cand-name')?.focus({ preventScroll: true })
    }, 50)
    setTimeout(() => setHl(cur => (cur === id ? '' : cur)), 4000)
  }

  useEffect(() => {
    ;(async () => {
      await load()
      // Dibuka via tombol "＋ Kandidat Baru" di topbar dari halaman lain
      try {
        if (sessionStorage.getItem('open-add-candidate') === '1') {
          sessionStorage.removeItem('open-add-candidate')
          setModal('new')
        }
      } catch { /* abaikan */ }
      const h = new URLSearchParams(window.location.search).get('highlight')
      if (h) focusRow(h)
    })()
    // Dibuka via tombol topbar saat sudah di halaman ini
    const handler = () => setModal('new')
    const hlHandler = (e: Event) => focusRow((e as CustomEvent<{ id: string }>).detail.id)
    window.addEventListener('highlight-candidate', hlHandler)
    window.addEventListener('open-add-candidate', handler)
    return () => {
      window.removeEventListener('open-add-candidate', handler)
      window.removeEventListener('highlight-candidate', hlHandler)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'

  const openAdd = () => setModal('new')
  const openEdit = (c: Candidate) => setModal(c)

  const deleteC = async (id: string) => {
    if (!confirm('Hapus kandidat ini beserta seluruh penilaiannya?')) return
    await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ candidateId: id }),
    })
    await load()
  }

  const setStage = async (id: string, stage: string) => {
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, stage }),
    })
    await load()
  }

  const generateInvite = async (c: Candidate) => {
    if (await inviteCandidate(c)) await load()
  }

  const scoreChip = (v: string, txt: string) => {
    const m: Record<string, string> = { Lolos: 'ok', Pertimbangkan: 'hold', 'Tidak Lolos': 'no', Rekomendasikan: 'ok', Tidak: 'no' }
    return <span className={`chip ${m[v] || 'neutral'}`}>{txt}</span>
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button className="btn primary" onClick={openAdd}>＋ Kandidat Baru</button>
        <button className="btn" style={{ marginLeft: 8 }} onClick={() => router.push('/hr/upload-cv')}>⬆ Upload CV</button>
      </div>

      {candidates.length === 0 ? (
        <div className="card card-p">
          <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Belum ada kandidat</div><div className="hint" style={{ marginTop: 4 }}>Tambahkan kandidat untuk memulai proses seleksi.</div></div>
        </div>
      ) : (
        <div className="card card-p">
          <div className="table-wrap">
            <table className="tbl tbl-fit cand-table">
            <thead><tr><th>Kandidat</th><th>Tahap</th><th>Hasil seleksi</th><th>Akun</th><th><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id} id={`cand-row-${c.id}`} className={`row-link${hl === c.id ? ' row-hl' : ''}`}
                  onClick={e => { if (!(e.target as HTMLElement).closest('button,a,select,input,label')) router.push(`/hr/candidates/${c.id}`) }}>
                  <td className="cell-cand">
                    <button type="button" className="cand-name linkish" onClick={() => router.push(`/hr/candidates/${c.id}`)}>{c.nama}</button>
                    <div className="hint">{posName(c.posisi)} · {c.sumber || '—'}{c.tanggal ? ` · ${c.tanggal}` : ''}</div>
                  </td>
                  <td>
                    <select value={c.stage} onChange={e => setStage(c.id, e.target.value)} aria-label={`Tahap ${c.nama}`}
                      className={`stage-select s-${c.stage}`}
                      title={c.stage === 'rejected' && c.cv?.reject_reason ? `Alasan: ${rejectReasonLabel(c.cv.reject_reason)}` : undefined}>
                      {Object.entries(STAGES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="results">
                      <span className="res" title={c.has_cv_file ? 'CV sudah diupload' : 'CV belum diupload'}>
                        <span className="k">CV</span>
                        {c.has_cv_file && <IconPaperclip size={13} />}
                        {c.cv ? scoreChip(c.cv.verdict, c.cv.percent + '%')
                          : c.ai_percent != null ? <span className="chip neutral" title="Draft AI, belum dinilai HR">AI {c.ai_percent}%</span>
                          : <span className="hint">—</span>}
                      </span>
                      <span className="res"><span className="k">DISC</span>{c.psikotes_result?.disc ? <b>{c.psikotes_result.disc.adapted.pattern.type}</b> : <span className="hint">—</span>}</span>
                      <span className="res"><span className="k">IQ</span>{c.psikotes_result?.iq ? <b>{c.psikotes_result.iq.percent}%</b> : <span className="hint">—</span>}</span>
                      <span className="res"><span className="k">Interview</span>{c.interview ? scoreChip(c.interview.verdict, c.interview.avg.toFixed(1)) : <span className="hint">—</span>}</span>
                    </div>
                  </td>
                  <td className="nowrap">
                    {c.user_id ? (
                      <span className="chip ok">Terdaftar</span>
                    ) : (
                      <button className="btn sm ghost" onClick={() => generateInvite(c)} title="Kirim undangan akun ke kandidat">
                        {c.invite_token ? 'Kirim ulang' : 'Undang'}
                      </button>
                    )}
                  </td>
                  <td className="actions">
                    <button className="btn sm icon-btn" onClick={() => router.push(`/hr/candidates/${c.id}`)} aria-label={`Detail ${c.nama}`} title="Detail"><IconEye size={15} /></button>
                    <button className="btn sm icon-btn" onClick={() => openEdit(c)} aria-label={`Edit ${c.nama}`} title="Edit"><IconEdit size={15} /></button>
                    <button className="btn sm danger icon-btn" onClick={() => deleteC(c.id)} aria-label={`Hapus ${c.nama}`} title="Hapus"><IconTrash size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {modal && (
        <CandidateFormModal editing={modal === 'new' ? null : modal} positions={positions}
          onPositionsChange={next => { setPositions(next); positionsRef.current = next }}
          onClose={() => setModal(null)} onSaved={async () => { await load() }} />
      )}
    </>
  )
}
