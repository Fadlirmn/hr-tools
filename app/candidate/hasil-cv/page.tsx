'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCandidateByUserId } from '@/lib/db'
import type { Candidate, Position, CvAssessment } from '@/lib/types'
import { CV_CRITERIA, POSITIONS_DEFAULT } from '@/lib/constants'

export default function CandidateHasilCvPage() {
  const supabase = createClient()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [positions, setPositions] = useState<Position[]>([])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const c = await getCandidateByUserId(user.id)
        setCandidate(c)
      }
      const { data: p } = await supabase.from('positions').select('*')
      setPositions((p && p.length > 0 ? p : JSON.parse(JSON.stringify(POSITIONS_DEFAULT))) as Position[])
    })()
  }, [])

  if (!candidate) return null

  const cv: CvAssessment | null = candidate.cv
  const posName = positions.find(p => p.id === candidate.posisi)?.name || '—'

  const verdictColor = (v: string) => v === 'Lolos' ? 'var(--ok)' : v === 'Pertimbangkan' ? 'var(--hold)' : 'var(--no)'
  const chipClass = (v: string) => v === 'Lolos' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : 'no'

  return (
    <div className="profile-section">
      <h3>📄 Hasil Penilaian CV</h3>
      {!cv ? (
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dinilai</div><div className="hint">HR belum melakukan penilaian CV untuk Anda.</div></div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <div className="gauge">
              <svg width="128" height="128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                <circle cx="64" cy="64" r="54" fill="none" stroke={verdictColor(cv.verdict)} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - cv.percent / 100)} />
              </svg>
              <div className="val"><b>{cv.percent}%</b><span>Skor CV</span></div>
            </div>
            <div>
              <span className={`chip ${chipClass(cv.verdict)}`} style={{ fontSize: 13, padding: '6px 14px' }}>{cv.verdict}</span>
              <div className="seg"><span className="lbl">Posisi</span><b>{posName}</b></div>
              <div className="seg"><span className="lbl">Dinilai pada</span><b>{cv.date}</b></div>
            </div>
          </div>

          {CV_CRITERIA.map(cr => {
            const score = cv.scores[cr.id]
            return (
              <div className="crit" key={cr.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <div className="top">
                  <div>
                    <div className="name">{cr.name}</div>
                    <div className="desc">{cr.desc}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: score && score >= 4 ? 'var(--ok)' : score && score >= 3 ? 'var(--hold)' : 'var(--no)' }}>
                    {score || '—'}
                  </div>
                </div>
              </div>
            )
          })}

          {cv.notes && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--violet-soft)', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>Catatan penilai:</div>
              <div style={{ fontSize: 13.5 }}>{cv.notes}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
