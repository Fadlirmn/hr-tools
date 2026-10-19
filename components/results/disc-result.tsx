'use client'

import { DISC_PROFILE_DESCRIPTIONS, DISC_DIMENSION_INFO } from '@/lib/constants'
import type { DiscResult as DiscResultData, DiscGraphResult, DiscProfileTendencies } from '@/lib/types'

interface Props {
  disc: DiscResultData | null | undefined
  /** Tidak dipakai lagi (header laporan dihilangkan); dibiarkan agar caller kompatibel. */
  nama?: string
  /** Teks saat belum ada hasil (default: sudut pandang kandidat). */
  emptyHint?: string
  /** Tampilkan siapa yang mengerjakan (untuk tampilan HR). */
  showMeta?: boolean
}

type Dim = 'D' | 'I' | 'S' | 'C'
const DIMS: Dim[] = ['D', 'I', 'S', 'C']

const TENDENCY_LABELS: { key: keyof DiscProfileTendencies; label: string }[] = [
  { key: 'goal', label: 'Goal' },
  { key: 'judges', label: 'Judges Others By' },
  { key: 'influence', label: 'Influences Others By' },
  { key: 'valueTo', label: 'Value to Organization' },
  { key: 'overuses', label: 'Overuses' },
  { key: 'underStress', label: 'Under Stress' },
  { key: 'fears', label: 'Fears' },
]

function fmtDate(d?: string) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function GraphCard({ title, graph }: { title: string; graph: DiscGraphResult }) {
  return (
    <div className="disc-graph">
      <div className="disc-graph-title">{title}</div>
      <div className="disc-graph-pattern">
        <span className={`disc-letter dim-${graph.pattern.type}`}>{graph.pattern.type}</span>
        <span className={`disc-pattern-name dim-${graph.pattern.type}`}>{graph.pattern.name}</span>
      </div>
      {DIMS.map(d => (
        <div className="disc-bar" key={d} title={DISC_DIMENSION_INFO[d].name}>
          <span className={`disc-bar-lbl dim-${d}`}>{d}</span>
          <div className="disc-bar-track">
            <i className={`bg-${d}`} style={{ width: graph.scores[d] + '%' }}></i>
            <span className="disc-bar-val" style={{ left: `calc(${graph.scores[d]}% + 8px)` }}>{graph.scores[d]}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProfileCard({ styleLabel, graph }: { styleLabel: string; graph: DiscGraphResult }) {
  const desc = DISC_PROFILE_DESCRIPTIONS[graph.pattern.name]
  const t = graph.pattern.type
  return (
    <div className="disc-profile">
      <div className="disc-profile-head">
        <span className={`disc-letter big dim-${t}`}>{t}</span>
        <div>
          <div className="disc-profile-name">{graph.pattern.name}</div>
          <div className="disc-profile-sub">{styleLabel}</div>
        </div>
      </div>
      {!desc ? (
        <div className="hint">Deskripsi profil untuk pola ini belum tersedia.</div>
      ) : (
        <>
          <div className="grid2 disc-profile-cols">
            <div>
              <div className="disc-sec-title">💪 Key Strengths</div>
              <ul className="disc-list">{desc.keyStrengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <div className="disc-sec-title">📈 Improve Effectiveness By</div>
              <ul className="disc-list">{desc.improveBy.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          </div>
          <div className="disc-tend-grid">
            {TENDENCY_LABELS.map(({ key, label }) => (
              <div className="disc-tend" key={key}>
                <div className="l">{label}</div>
                <div className="v">{desc.tendencies[key]}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function DiscResult({ disc, emptyHint = 'HR belum memasukkan hasil Tes DISC Anda.', showMeta = false }: Props) {
  if (!disc) {
    return (
      <div className="profile-section">
        <h3>🧩 Hasil Tes DISC</h3>
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dites</div><div className="hint">{emptyHint}</div></div>
      </div>
    )
  }

  return (
    <div className="disc-report">
      <div className="profile-section" style={{ marginBottom: 16 }}>
        <h3>🧩 Hasil Tes DISC</h3>
        <div className="grid2 disc-graphs">
          <GraphCard title="Adapted Style" graph={disc.adapted} />
          <GraphCard title="Natural Style" graph={disc.natural} />
        </div>
        <div className="disc-legend">
          {DIMS.map(d => (
            <span key={d}><b className={`dim-${d}`}>{d}</b> {DISC_DIMENSION_INFO[d].name}<span className="hint"> — {DISC_DIMENSION_INFO[d].desc}</span></span>
          ))}
        </div>
        {showMeta && (
          <div className="hint" style={{ marginTop: 10 }}>
            Tanggal: {fmtDate(disc.date)} · {disc.via === 'kandidat' ? 'Dikerjakan mandiri' : 'Diinput HR'}
          </div>
        )}
      </div>

      <div className="disc-sec-kicker">Profil Perilaku — Adapted Style</div>
      <ProfileCard styleLabel="Adapted Style" graph={disc.adapted} />

      <div className="disc-sec-kicker">Profil Perilaku — Natural Style</div>
      <ProfileCard styleLabel="Natural Style" graph={disc.natural} />
    </div>
  )
}
