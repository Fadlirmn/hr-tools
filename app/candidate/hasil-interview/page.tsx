'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCandidateByUserId } from '@/lib/db'
import type { Candidate, InterviewAssessment } from '@/lib/types'
import { INT_COMP } from '@/lib/constants'

export default function CandidateHasilInterviewPage() {
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

  const int: InterviewAssessment | null = candidate.interview

  const verdictColor = (v: string) => v === 'Rekomendasikan' ? 'var(--ok)' : v === 'Pertimbangkan' ? 'var(--hold)' : 'var(--no)'
  const chipClass = (v: string) => v === 'Rekomendasikan' ? 'ok' : v === 'Pertimbangkan' ? 'hold' : 'no'

  return (
    <div className="profile-section">
      <h3>🎤 Hasil Interview</h3>
      {!int ? (
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dinilai</div><div className="hint">HR belum melakukan penilaian interview untuk Anda.</div></div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <div className="gauge">
              <svg width="128" height="128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                <circle cx="64" cy="64" r="54" fill="none" stroke={verdictColor(int.verdict)} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - int.avg / 5)} />
              </svg>
              <div className="val"><b>{int.avg.toFixed(1)}</b><span>rata-rata</span></div>
            </div>
            <div>
              <span className={`chip ${chipClass(int.verdict)}`} style={{ fontSize: 13, padding: '6px 14px' }}>{int.verdict}</span>
              <div className="seg"><span className="lbl">Pewawancara</span><b>{int.by || '—'}</b></div>
              <div className="seg"><span className="lbl">Tanggal</span><b>{int.date}</b></div>
              <div className="seg"><span className="lbl">Rekomendasi</span><b>{int.rec || '—'}</b></div>
            </div>
          </div>

          {INT_COMP.map(cp => {
            const score = int.scores[cp.id]
            return (
              <div className="crit" key={cp.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <div className="top">
                  <div>
                    <div className="name">{cp.name}</div>
                    <div className="desc">{cp.desc}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: score && score >= 4 ? 'var(--ok)' : score && score >= 3 ? 'var(--hold)' : 'var(--no)' }}>
                    {score || '—'}
                  </div>
                </div>
              </div>
            )
          })}

          {int.notes && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--violet-soft)', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>Catatan interviewer:</div>
              <div style={{ fontSize: 13.5 }}>{int.notes}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
