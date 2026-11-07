'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import type { Candidate, Position } from '@/lib/types'
import { STAGES } from '@/lib/constants'
import { buildStats, buildTasks, TASK_GROUPS, type TaskKind } from '@/lib/dashboard-stats'
import {
  IconFileCheck, IconClipboard, IconPause, IconClock, IconAlert, IconKey, IconArrowRight, IconPaperclip, IconCheckCircle,
} from '@/components/icons'

const TASK_ICON: Record<TaskKind, React.ReactNode> = {
  cv: <IconFileCheck size={16} />, interview: <IconClipboard size={16} />, hold: <IconPause size={16} />,
  test_pending: <IconClock size={16} />, test_expired: <IconKey size={16} />, ai_error: <IconAlert size={16} />,
}
const SHOW = 4
const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : v === 'Tidak Lolos' ? 'no' : 'neutral'

export default function HrDashboardPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    ;(async () => {
      const c = await fetchCandidates()
      setCandidates(c as Candidate[])
      setPositions(await getPositions())
      setLoaded(true)
    })()
  }, [])

  const posName = (id: string) => positions.find(p => p.id === id)?.name || '—'
  const s = buildStats(candidates)
  const tasks = buildTasks(candidates, posName)
  const groups = TASK_GROUPS.map(g => ({ ...g, items: tasks.filter(t => t.kind === g.kind) })).filter(g => g.items.length)
  const maxSrc = Math.max(1, ...s.sumber.map(x => x.n))

  return (
    <>
      <div className="stats dash-stats">
        {([
          ['Total kandidat', s.total, `${s.active} aktif`, ''],
          ['CV perlu dinilai', s.cvTodo, 'menunggu HR', '/hr/cv'],
          ['Ditahan', s.hold, 'perlu keputusan', ''],
          ['Diterima', s.hired, '', ''],
          ['Ditolak', s.rejected, '', ''],
        ] as [string, number, string, string][]).map(([l, n, sub, href]) => {
          const body = (<>
            <div className="n">{n}</div>
            <div className="l">{l}{sub && <span className="hint"> · {sub}</span>}</div>
            <div className="bar"><i style={{ width: s.total ? Math.round(n / s.total * 100) + '%' : '0%' }}></i></div>
          </>)
          return href ? <Link key={l} href={href} className="stat stat-link">{body}</Link> : <div className="stat" key={l}>{body}</div>
        })}
      </div>

      {/* Antrian kerja */}
      <div className="card card-p" style={{ marginBottom: 22 }}>
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="tag">Hari ini</span><h3>Yang perlu dikerjakan</h3>
          <span className="meta">{tasks.length} item</span>
        </div>
        {!loaded ? <div className="hint">Memuat…</div> : groups.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>
            <div className="big" style={{ color: 'var(--ok)' }}><IconCheckCircle size={34} /></div>
            <div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Semua beres</div>
            <div className="hint">Tidak ada CV, tes, atau interview yang menunggu.</div>
          </div>
        ) : (
          <div className="task-grid">
            {groups.map(g => {
              const all = !!expanded[g.kind]
              return (
                <section key={g.kind} className={`task-group k-${g.kind}`} aria-labelledby={`tg-${g.kind}`}>
                  <header>
                    <span className="ti">{TASK_ICON[g.kind]}</span>
                    <div><h4 id={`tg-${g.kind}`}>{g.title} <span className="count">{g.items.length}</span></h4><div className="hint">{g.hint}</div></div>
                  </header>
                  <ul>
                    {(all ? g.items : g.items.slice(0, SHOW)).map(t => (
                      <li key={t.kind + t.id}>
                        <Link href={t.href}>
                          <span className="nm">{t.nama}<small>{t.posisi} · {t.meta}</small></span>
                          <IconArrowRight size={14} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {g.items.length > SHOW && (
                    <button type="button" className="btn ghost sm" onClick={() => setExpanded(e => ({ ...e, [g.kind]: !all }))}>
                      {all ? 'Tampilkan lebih sedikit' : `Lihat ${g.items.length - SHOW} lainnya`}
                    </button>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      <div className="dash-cols">
        <div className="card card-p">
          <h4 className="blk" style={{ marginTop: 0 }}>Funnel Pipeline</h4>
          {s.funnel.map(({ stage, n }) => {
            const pct = s.total ? Math.round(n / s.total * 100) : 0
            const color = stage === 'rejected' ? 'var(--no)' : stage === 'hold' ? 'var(--hold)' : stage === 'hired' ? 'var(--ok)' : 'var(--violet)'
            return (
              <div className="seg" key={stage}>
                <span className="lbl">{STAGES[stage]}</span>
                <div className="track"><i style={{ width: pct + '%', background: color }}></i></div>
                <span className="pct">{n}<span className="hint"> · {pct}%</span></span>
              </div>
            )
          })}
        </div>

        <div className="card card-p">
          <h4 className="blk" style={{ marginTop: 0 }}>Sumber CV</h4>
          {s.sumber.length === 0 ? <div className="hint">Belum ada data.</div> : s.sumber.map(x => (
            <div className="seg" key={x.name}>
              <span className="lbl">{x.name}</span>
              <div className="track"><i style={{ width: Math.round(x.n / maxSrc * 100) + '%', background: 'var(--accent)' }}></i></div>
              <span className="pct">{x.n}</span>
              <span className="hint src-avg">{x.avg != null ? `rata² ${x.avg}%` : '—'}</span>
            </div>
          ))}
          <div className="hint" style={{ marginTop: 8 }}>Rata-rata memakai skor HR, atau draft AI bila belum dinilai.</div>
        </div>
      </div>

      <div className="card card-p">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h4 className="blk" style={{ margin: 0 }}>Kandidat Terbaru</h4>
          <Link className="btn ghost sm" href="/hr/candidates">Lihat semua<IconArrowRight size={14} /></Link>
        </div>
        {loaded && s.total === 0 ? (
          <div className="empty"><div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Belum ada kandidat</div><div className="hint" style={{ marginTop: 4 }}>Klik &quot;Kandidat Baru&quot; atau upload CV massal untuk mulai.</div></div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Nama</th><th>Posisi</th><th>Sumber</th><th>Tahap</th><th>Skor CV</th></tr></thead>
              <tbody>
                {candidates.slice(0, 6).map(c => (
                  <tr key={c.id}>
                    <td className="cand-name nowrap" onClick={() => router.push(`/hr/candidates/${c.id}`)}>{c.nama}<div className="hint">{c.tanggal}</div></td>
                    <td>{posName(c.posisi)}</td>
                    <td className="nowrap">{c.sumber || '—'}</td>
                    <td><span className={`stagepill s-${c.stage}`}>{STAGES[c.stage]}</span></td>
                    <td className="nowrap">
                      {c.has_cv_file && <span style={{ color: 'var(--violet)', marginRight: 6 }}><IconPaperclip size={14} title="CV sudah diupload" /></span>}
                      {c.cv ? <span className={`chip ${chipClass(c.cv.verdict)}`}>{c.cv.percent}%</span>
                        : c.ai_percent != null ? <span className="chip neutral" title="Draft AI, belum dinilai HR">AI {c.ai_percent}%</span>
                        : <span className="hint">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
