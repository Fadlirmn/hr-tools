'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import type { Candidate } from '@/lib/types'

export default function CandidateHasilTesIqPage() {
  const [candidate, setCandidate] = useState<Candidate | null>(null)

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (user) {
        const c = await getCandidateByUserId(user.id)
        setCandidate(c)
      }
    })()
  }, [])

  if (!candidate) return null

  const iq = candidate.psikotes_result?.iq

  const categoryColor = (cat: string) => cat === 'Tinggi' ? 'var(--ok)' : cat === 'Rata-rata' ? 'var(--hold)' : 'var(--no)'

  return (
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
  )
}
