'use client'

import { IQ_SECTION_INFO, IQ_DISCLAIMER } from '@/lib/constants'
import { calcIq, estimateIq, classifyIq, sectionLevel, IQ_CATEGORIES } from '@/lib/iq-scoring'
import type { IqResult as IqResultData, IqQuestion, IqCategory, IqSectionScore } from '@/lib/types'

interface Props {
  iq: IqResultData | null | undefined
  emptyHint?: string
  showMeta?: boolean
  /** Tampilan laporan lengkap (sisi HR): perkiraan IQ, bar per bagian, interpretasi. */
  detail?: boolean
  /** Bank soal aktif — dipakai menghitung skor per bagian untuk hasil lama tanpa `sections`. */
  questions?: IqQuestion[]
}

const categoryColor = (cat: string) => cat === 'Tinggi' ? 'var(--ok)' : cat === 'Rata-rata' ? 'var(--hold)' : 'var(--no)'
const levelColor = (p: number) => categoryColor(p >= 80 ? 'Tinggi' : p >= 50 ? 'Rata-rata' : '')
const LEVEL_LABEL = { kuat: 'Kuat', cukup: 'Cukup', lemah: 'Lemah' } as const

function Gauge({ iq }: { iq: IqResultData }) {
  return (
    <div className="gauge">
      <svg width="128" height="128">
        <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
        <circle cx="64" cy="64" r="54" fill="none" stroke={categoryColor(iq.category)} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - iq.percent / 100)} />
      </svg>
      <div className="val"><b className="sm">{iq.correct}/{iq.total}</b><span>{iq.percent}%</span></div>
    </div>
  )
}

function MetaSegs({ iq }: { iq: IqResultData }) {
  return (
    <>
      <div className="seg"><span className="lbl">Tanggal</span><b>{iq.date || '—'}</b></div>
      <div className="seg"><span className="lbl">Dikerjakan</span><b>{iq.via === 'kandidat' ? 'Mandiri oleh kandidat' : 'Diinput HR'}{iq.auto ? ' · otomatis (waktu habis)' : ''}</b></div>
    </>
  )
}

function resolveSections(iq: IqResultData, questions?: IqQuestion[]): Record<IqCategory, IqSectionScore> | null {
  if (iq.sections) return iq.sections
  if (questions && questions.length > 0) return calcIq(iq.answers || {}, questions).sections
  return null
}

export default function IqResult({ iq, emptyHint = 'HR belum memasukkan hasil Tes IQ Anda.', showMeta = false, detail = false, questions }: Props) {
  if (!iq) {
    return (
      <div className="profile-section">
        <h3>🧠 Hasil Tes IQ</h3>
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dites</div><div className="hint">{emptyHint}</div></div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="profile-section">
        <h3>🧠 Hasil Tes IQ</h3>
        <div className="scorecard" style={{ marginBottom: 18 }}>
          <Gauge iq={iq} />
          {showMeta && <div><MetaSegs iq={iq} /></div>}
        </div>
        <div className="verdict-line">
          Kategori: <b>{iq.category}</b>
          {!showMeta && iq.via === 'kandidat' && <span className="chip neutral" style={{ marginLeft: 8 }}>Dikerjakan mandiri</span>}
        </div>
      </div>
    )
  }

  // --- Laporan lengkap (HR) ---
  const score = estimateIq(iq.percent)
  const cls = classifyIq(score)
  const sections = resolveSections(iq, questions)
  const secList = sections
    ? IQ_CATEGORIES.filter(c => sections[c] && sections[c].total > 0).map(c => ({ key: c, ...sections[c], level: sectionLevel(sections[c].percent) }))
    : []
  const sorted = [...secList].sort((a, b) => b.percent - a.percent)
  const strongList = secList.filter(s => s.level === 'kuat')
  const weakList = secList.filter(s => s.level !== 'kuat')
  // Kalau semua kuat / semua lemah, tampilkan yang relatif tertinggi / terendah.
  const strengths = strongList.length ? strongList : sorted.slice(0, 1)
  const strengthsRelative = strongList.length === 0 && sorted.length > 0
  const improves = weakList.length ? [...weakList].sort((a, b) => a.percent - b.percent) : sorted.slice(-1)
  const improvesRelative = weakList.length === 0 && sorted.length > 0

  return (
    <div className="iq-report">
      <div className="profile-section" style={{ marginBottom: 16 }}>
        <h3>🧠 Hasil Tes IQ</h3>
        <div className="scorecard" style={{ marginBottom: 18 }}>
          <Gauge iq={iq} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="seg"><span className="lbl">Perkiraan IQ</span><b className="iq-score-big">{score}</b></div>
            <div className="seg"><span className="lbl">Klasifikasi</span><b>{cls.label}</b></div>
            <div className="seg"><span className="lbl">Kategori</span><b style={{ color: categoryColor(iq.category) }}>{iq.category}</b></div>
            {showMeta && <MetaSegs iq={iq} />}
          </div>
        </div>

        {secList.length > 0 && (
          <div className="disc-graph">
            <div className="disc-graph-title">Skor per Bagian</div>
            {secList.map(s => (
              <div className="disc-bar" key={s.key}>
                <span className="iq-bar-lbl">{IQ_SECTION_INFO[s.key].name}</span>
                <div className="disc-bar-track">
                  <i style={{ width: `${s.percent}%`, background: levelColor(s.percent) }} />
                  <span className="disc-bar-val" style={{ left: `calc(${Math.min(s.percent, 85)}% + 8px)` }}>{s.correct}/{s.total} · {s.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="hint" style={{ marginTop: 12 }}>{IQ_DISCLAIMER}</div>
      </div>

      <div className="disc-sec-kicker">Interpretasi Hasil</div>
      <div className="disc-profile">
        <div className="disc-profile-head">
          <div className="disc-letter big" style={{ color: categoryColor(iq.category), width: 'auto', minWidth: 72 }}>{score}</div>
          <div>
            <div className="disc-profile-name">{cls.label}</div>
            <div className="disc-profile-sub">{cls.desc}</div>
          </div>
        </div>

        {secList.length > 0 && (
          <>
            <div className="grid2 disc-profile-cols">
              <div>
                <div className="disc-sec-title">💪 Kemampuan Menonjol{strengthsRelative && <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>(relatif tertinggi)</span>}</div>
                <ul className="disc-list">
                  {strengths.map(s => <li key={s.key}><b>{IQ_SECTION_INFO[s.key].name}</b> — {IQ_SECTION_INFO[s.key].strong}</li>)}
                </ul>
              </div>
              <div>
                <div className="disc-sec-title">📈 Perlu Dikembangkan{improvesRelative && <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>(relatif terendah)</span>}</div>
                <ul className="disc-list">
                  {improves.map(s => <li key={s.key}><b>{IQ_SECTION_INFO[s.key].name}</b> — {IQ_SECTION_INFO[s.key].weak}</li>)}
                </ul>
              </div>
            </div>
            <div className="disc-tend-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {secList.map(s => (
                <div className="disc-tend" key={s.key}>
                  <div className="l">{IQ_SECTION_INFO[s.key].name}<span className={`iq-lvl ${s.level}`}>{LEVEL_LABEL[s.level]}</span></div>
                  <div className="v"><b style={{ color: 'var(--ink)' }}>{s.percent}%</b> · {IQ_SECTION_INFO[s.key].desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
