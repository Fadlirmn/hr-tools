'use client'

import { DISC_PROFILE_DESCRIPTIONS, DISC_DIMENSION_INFO } from '@/lib/constants'
import type { DiscResult as DiscResultData, DiscGraphResult } from '@/lib/types'

interface Props {
  disc: DiscResultData | null | undefined
  /** Teks saat belum ada hasil (default: sudut pandang kandidat). */
  emptyHint?: string
  /** Tampilkan tanggal & siapa yang mengerjakan (untuk tampilan HR). */
  showMeta?: boolean
}

function DiscGraph({ label, graph }: { label: string; graph: DiscGraphResult }) {
  const desc = DISC_PROFILE_DESCRIPTIONS[graph.pattern.name]
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="verdict-line" style={{ marginBottom: 10 }}>
        {label}: <b>{graph.pattern.name}</b> (tipe {graph.pattern.type})
      </div>
      {(['D', 'I', 'S', 'C'] as const).map(d => (
        <div className="seg" key={d}>
          <span className="lbl"><b>{d}</b> <span style={{ fontWeight: 500 }}>· {DISC_DIMENSION_INFO[d].name}</span></span>
          <div className="track"><i style={{ width: graph.scores[d] + '%', background: 'var(--violet)' }}></i></div>
          <span className="pct">{graph.scores[d]}</span>
        </div>
      ))}
      <div className="disc-dim-note">
        Tipe dominan: <b>{graph.pattern.type} · {DISC_DIMENSION_INFO[graph.pattern.type].name}</b> — {DISC_DIMENSION_INFO[graph.pattern.type].desc}
      </div>
      {desc && (
        <div className="grid2" style={{ gap: 12, marginTop: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>💪 Kekuatan</div>
            <ul style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 18 }}>
              {desc.keyStrengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>📈 Area Pengembangan</div>
            <ul style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 18 }}>
              {desc.improveBy.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DiscResult({ disc, emptyHint = 'HR belum memasukkan hasil Tes DISC Anda.', showMeta = false }: Props) {
  return (
    <div className="profile-section">
      <h3>🧩 Hasil Tes DISC</h3>
      {!disc ? (
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dites</div><div className="hint">{emptyHint}</div></div>
      ) : (
        <>
          <DiscGraph label="Adapted Style (gaya kerja di lingkungan kerja)" graph={disc.adapted} />
          <DiscGraph label="Natural Style (gaya alami/dasar)" graph={disc.natural} />
          <div className="disc-legend">
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Arti dimensi DISC</div>
            {(['D', 'I', 'S', 'C'] as const).map(d => (
              <div className="row" key={d}><b>{d}</b><span><b>{DISC_DIMENSION_INFO[d].name}</b> — {DISC_DIMENSION_INFO[d].desc}</span></div>
            ))}
          </div>
          {showMeta && disc.date && <div className="seg"><span className="lbl">Tanggal</span><b>{disc.date}</b></div>}
          {disc.via === 'kandidat'
            ? <span className="chip neutral">Dikerjakan mandiri</span>
            : showMeta && <span className="chip neutral">Diinput HR</span>}
        </>
      )}
    </div>
  )
}
