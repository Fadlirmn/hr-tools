'use client'

import { Fragment, useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getPositions } from '@/lib/db'
import { STAGES } from '@/lib/constants'
import type { Position } from '@/lib/types'
import { normalize } from '@/lib/candidate-filter'
import { countByPosition, cvStats, sortForTable, suggestCandidates, type CvOverviewItem } from '@/lib/cv-overview'
import CvBulkUpload from '@/components/cv-bulk-upload'
import HrCvDrop from '@/components/hr-cv-drop'
import { IconArrowRight, IconAward, IconInfo, IconRefresh, IconSearch, IconSparkle, IconUpload } from '@/components/icons'

export default function HrUploadCvPage() {
  return (
    <Suspense fallback={<div className="hint">Memuat...</div>}>
      <UploadCvContent />
    </Suspense>
  )
}

const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : v === 'Tidak Lolos' ? 'no' : 'neutral'
const reviewHref = (id: string) => `/hr/cv?candidateId=${encodeURIComponent(id)}`

function UploadCvContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<CvOverviewItem[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [aiEnabled, setAiEnabled] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [q, setQ] = useState('')
  const [openRow, setOpenRow] = useState('')
  const [bulkRunning, setBulkRunning] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/cv-screen?list=1', { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      setItems(d.items || [])
      setAiEnabled(!!d.aiEnabled)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const [, pos] = await Promise.all([load(), getPositions()])
      setPositions(pos)
      setLoaded(true)
    })()
    // CV disimpan dari Asisten (chat) → muat ulang
    const onChange = () => { void load() }
    window.addEventListener('cv-data-changed', onChange)
    return () => window.removeEventListener('cv-data-changed', onChange)
  }, [load])

  // Filter tampilan dari URL (?posisi=); kosong = semua posisi
  const counts = useMemo(() => countByPosition(items), [items])
  const urlPos = searchParams.get('posisi') || ''
  const posId = positions.some(p => p.id === urlPos) ? urlPos : ''
  const pos = positions.find(p => p.id === posId) || null
  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'
  const chooseFilter = (id: string) => {
    setOpenRow('')
    const sp = new URLSearchParams(window.location.search)
    if (id) sp.set('posisi', id); else sp.delete('posisi')
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const inPos = useMemo(() => posId ? items.filter(x => x.posisi === posId) : items, [items, posId])
  const stats = cvStats(inPos)
  const suggest = suggestCandidates(inPos)
  const rows = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean)
    const base = sortForTable(inPos)
    return words.length ? base.filter(x => words.every(w => normalize(x.nama).includes(w))) : base
  }, [inPos, q])

  // Refresh otomatis selama AI masih menganalisis
  const processing = stats.processing > 0
  useEffect(() => {
    if (!processing || bulkRunning) return
    const t = setInterval(() => { void load() }, 4000)
    return () => clearInterval(t)
  }, [processing, bulkRunning, load])

  const reanalyze = async (id: string) => {
    const res = await fetch('/api/cv-screen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ candidateId: id }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Gagal: ' + (d.error || res.status)); return }
    await load()
  }

  if (!loaded) return <div className="hint">Memuat...</div>
  if (!positions.length) {
    return <div className="card card-p"><div className="hint">Belum ada posisi. Tambahkan dulu di <Link href="/hr/settings">Posisi &amp; Kualifikasi</Link>.</div></div>
  }

  return (
    <>
      {/* Upload massal: posisi dipilih lewat dropdown */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag"><IconUpload size={12} /></span><h3>Upload CV</h3>
          <span className="meta">Tiap file jadi kandidat baru, lalu dibaca AI</span>
        </div>
        <CvBulkUpload positions={positions} defaultPosisi={posId || undefined} onProgress={load} onRunningChange={setBulkRunning} />
        {!aiEnabled && <div className="hint" style={{ marginTop: 8 }}>Analisis AI belum aktif (atur di Pengaturan → Pengaturan AI). CV tetap tersimpan.</div>}
      </div>

      {/* Filter tampilan */}
      <div className="upcv-filter no-print">
        <label htmlFor="upcv-filter">Tampilkan</label>
        <select id="upcv-filter" value={posId} onChange={e => chooseFilter(e.target.value)}>
          <option value="">Semua posisi ({items.length})</option>
          {positions.map(p => <option key={p.id} value={p.id}>{p.name} ({counts[p.id] || 0})</option>)}
        </select>
      </div>

            {/* Rangkuman */}
            <div className="card card-p">
              <div className="section-head" style={{ marginTop: 0 }}>
                <span className="tag"><IconSparkle size={12} /></span><h3>Rangkuman AI · {pos ? pos.name : 'Semua posisi'}</h3>
                {processing && <span className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className="spinner" aria-hidden="true" />{stats.processing} dianalisis…</span>}
              </div>
              <div className="upcv-stats">
                <div><b>{stats.total}</b><span>Kandidat</span></div>
                <div><b>{stats.analyzed}</b><span>Dianalisis AI</span></div>
                <div className="ok"><b>{stats.lolos}</b><span>Memenuhi syarat</span></div>
                <div className="hold"><b>{stats.pertimbangkan}</b><span>Pertimbangkan</span></div>
                <div className="no"><b>{stats.tidakLolos}</b><span>Tidak lolos</span></div>
                <div><b>{stats.noCv}</b><span>Belum ada CV</span></div>
              </div>
              {stats.error > 0 && <div className="hint" style={{ color: 'var(--no)', marginTop: 8 }}>{stats.error} CV gagal dianalisis, klik Analisis ulang di tabel.</div>}
              <div className="notice" style={{ marginTop: 12 }}>
                <IconInfo size={16} style={{ marginTop: 1, color: 'var(--violet)' }} />
                <div>
                  {!pos
                    ? <>AI menilai tiap CV terhadap kualifikasi posisinya masing-masing. Pilih satu posisi di filter untuk melihat kualifikasinya.</>
                    : pos.description?.trim()
                    ? <>AI menilai terhadap kualifikasi posisi ini: <i>{pos.description.trim().slice(0, 220)}{pos.description.trim().length > 220 ? '…' : ''}</i></>
                    : <>Kualifikasi posisi belum diisi, jadi AI memakai standar umum. Isi di <Link href="/hr/settings">Posisi &amp; Kualifikasi</Link> agar saran lebih tepat.</>}
                </div>
              </div>
            </div>

          {/* Saran kandidat */}
          <div className="section-head">
            <span className="tag"><IconAward size={12} /></span>
            <h3>{suggest.strict ? 'Disarankan: memenuhi persyaratan' : 'Belum ada yang memenuhi syarat · paling mendekati'}</h3>
            <span className="meta">
              {suggest.closedLolos > 0 && `${suggest.closedLolos} lainnya sudah ditolak/diterima, tidak ditampilkan · `}Draft AI, keputusan tetap di HR
            </span>
          </div>
          {suggest.list.length === 0 ? (
            <div className="card card-p"><div className="hint">{stats.analyzed ? 'Belum ada kandidat yang disarankan untuk posisi ini.' : 'Upload CV, hasil analisis AI akan muncul di sini.'}</div></div>
          ) : (
            <div className="upcv-suggest">
              {suggest.list.map((x, i) => (
                <div key={x.id} className="card card-p">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15 }}>{i + 1}. {x.nama}</b>
                    <span className={`chip ${chipClass(x.ai!.verdict)}`}>AI {x.ai!.percent}% · {x.ai!.verdict}</span>
                    {x.hr_done && <span className="chip violet">Sudah dinilai HR</span>}
                  </div>
                  <div className="hint" style={{ marginTop: 4 }}>
                    {[posId ? '' : posName(x.posisi), x.ai!.pengalaman_tahun != null ? `${x.ai!.pengalaman_tahun} th pengalaman` : '', x.ai!.pendidikan_terakhir, STAGES[x.stage] || x.stage].filter(Boolean).join(' · ')}
                  </div>
                  {x.ai!.ringkasan && <p style={{ fontSize: 13.5, margin: '8px 0 0' }}>{x.ai!.ringkasan}</p>}
                  {x.ai!.skills.length > 0 && <div className="hint" style={{ marginTop: 6 }}>Skill: {x.ai!.skills.slice(0, 8).join(', ')}</div>}
                  <div className="cv-ai-cols">
                    {x.ai!.strengths.length > 0 && <div><b>Kekuatan</b><ul>{x.ai!.strengths.slice(0, 3).map((s, j) => <li key={j}>{s}</li>)}</ul></div>}
                    {x.ai!.concerns.length > 0 && <div><b>Perlu digali</b><ul>{x.ai!.concerns.slice(0, 3).map((s, j) => <li key={j}>{s}</li>)}</ul></div>}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Link className="btn sm primary" href={reviewHref(x.id)}>Nilai CV<IconArrowRight size={14} /></Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Semua kandidat posisi ini */}
          <div className="section-head">
            <span className="tag">CV</span><h3>Kandidat · {pos ? pos.name : 'Semua posisi'}</h3>
          </div>
          <div className="card card-p">
            <div className="picker-box" style={{ marginBottom: 10, maxWidth: 360 }}>
              <label htmlFor="upcv-q" className="sr-only">Cari nama kandidat</label>
              <IconSearch size={16} className="ico-svg picker-ico" />
              <input id="upcv-q" type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama kandidat…" autoComplete="off" />
            </div>
            {rows.length === 0 ? (
              <div className="hint">{inPos.length ? 'Tidak ada nama yang cocok.' : pos ? 'Belum ada kandidat di posisi ini.' : 'Belum ada kandidat.'}</div>
            ) : (
              <div className="table-wrap">
                <table className="tbl tbl-fit">
                  <thead><tr><th>Kandidat</th><th>CV</th><th>Hasil AI</th><th><span className="sr-only">Aksi</span></th></tr></thead>
                  <tbody>
                    {rows.map(x => (
                      <Fragment key={x.id}>
                        <tr>
                          <td><b>{x.nama}</b><div className="hint">{posId ? '' : `${posName(x.posisi)} · `}{STAGES[x.stage] || x.stage}{x.tanggal ? ` · ${x.tanggal}` : ''}</div></td>
                          <td>{x.has_cv_file
                            ? <span className="hint" title={x.filename || ''} style={{ display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{x.filename}</span>
                            : <span className="chip neutral">Belum ada</span>}</td>
                          <td>
                            {x.ai ? <span className={`chip ${chipClass(x.ai.verdict)}`}>{x.ai.percent}% · {x.ai.verdict}</span>
                              : x.ai_status === 'processing' ? <span className="hint" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span className="spinner" aria-hidden="true" />Menganalisis…</span>
                              : x.ai_status === 'error' ? <span className="chip no" title={x.ai_error || ''}>Gagal</span>
                              : <span className="hint">—</span>}
                          </td>
                          <td className="actions nowrap">
                            {x.has_cv_file && aiEnabled && (x.ai_status === 'error' || x.ai_status === 'none') && (
                              <button type="button" className="btn sm" onClick={() => reanalyze(x.id)}><IconRefresh size={14} />Analisis</button>
                            )}
                            <button type="button" className="btn sm" aria-expanded={openRow === x.id} onClick={() => setOpenRow(openRow === x.id ? '' : x.id)}>
                              <IconUpload size={14} />{x.has_cv_file ? 'Ganti CV' : 'Upload CV'}
                            </button>
                            {x.has_cv_file && <Link className="btn sm" href={reviewHref(x.id)}>Nilai</Link>}
                          </td>
                        </tr>
                        {openRow === x.id && (
                          <tr><td colSpan={4}>
                            <HrCvDrop compact candidateId={x.id} currentFilename={x.filename}
                              onUploaded={async () => { await load() }} />
                          </td></tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
    </>
  )
}
