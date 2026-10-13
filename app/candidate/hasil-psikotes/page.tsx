'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCandidateByUserId } from '@/lib/db'
import { DISC_PROFILE_DESCRIPTIONS } from '@/lib/constants'
import type { Candidate, DiscGraphResult } from '@/lib/types'

export default function CandidateHasilPsikotesPage() {
  const supabase = createClient()
  const [candidate, setCandidate] = useState<Candidate | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const c = await getCandidateByUserId(user.id)
        setCandidate(c)
      }
    })()
  }, [])

  if (!candidate) return null

  const disc = candidate.psikotes_result?.disc
  const iq = candidate.psikotes_result?.iq

  const categoryColor = (cat: string) => cat === 'Tinggi' ? 'var(--ok)' : cat === 'Rata-rata' ? 'var(--hold)' : 'var(--no)'

  const renderDiscGraph = (label: string, graph: DiscGraphResult) => {
    const desc = DISC_PROFILE_DESCRIPTIONS[graph.pattern.name]
    return (
      <div style={{ marginBottom: 20 }}>
        <div className="verdict-line" style={{ marginBottom: 10 }}>
          {label}: <b>{graph.pattern.name}</b> (tipe {graph.pattern.type})
        </div>
        {(['D', 'I', 'S', 'C'] as const).map(d => (
          <div className="seg" key={d}>
            <span className="lbl">{d}</span>
            <div className="track"><i style={{ width: graph.scores[d] + '%', background: 'var(--violet)' }}></i></div>
            <span className="pct">{graph.scores[d]}</span>
          </div>
        ))}
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

  return (
    <>
      <div className="profile-section">
        <h3>🧩 Hasil Tes DISC</h3>
        {!disc ? (
          <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dites</div><div className="hint">HR belum memasukkan hasil Tes DISC Anda.</div></div>
        ) : (
          <>
            {renderDiscGraph('Adapted Style (gaya kerja di lingkungan kerja)', disc.adapted)}
            {renderDiscGraph('Natural Style (gaya alami/dasar)', disc.natural)}
            {disc.via === 'kandidat' && <span className="chip neutral">Dikerjakan mandiri</span>}
          </>
        )}
      </div>

      <div className="profile-section">
        <h3>🧠 Hasil Tes IQ</h3>
        {!iq ? (
          <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dites</div><div className="hint">HR belum memasukkan hasil Tes IQ Anda.</div></div>
        ) : (
          <>
            <div className="scorecard" style={{ marginBottom: 18 }}>
              <div className="gauge">
                <svg width="128" height="128">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                  <circle cx="64" cy="64" r="54" fill="none" stroke={categoryColor(iq.category)} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - iq.percent / 100)} />
                </svg>
                <div className="val"><b>{iq.correct}/{iq.total}</b><span>{iq.percent}%</span></div>
              </div>
            </div>
            <div className="verdict-line">
              Kategori: <b>{iq.category}</b>
              {iq.via === 'kandidat' && <span className="chip neutral" style={{ marginLeft: 8 }}>Dikerjakan mandiri</span>}
            </div>
          </>
        )}
      </div>
    </>
  )
}
