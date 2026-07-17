'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCandidateByUserId } from '@/lib/db'
import { loadQuestions } from '@/lib/questions'
import type { Candidate, PsikotesResult, PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from '@/lib/types'

export default function CandidateHasilPsikotesPage() {
  const supabase = createClient()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [questions, setQuestions] = useState<{ cog: PsiCogQuestion[]; trait: PsiTraitQuestion[]; sjt: PsiSjtQuestion[] } | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const c = await getCandidateByUserId(user.id)
        setCandidate(c)
      }
      const q = await loadQuestions()
      setQuestions(q)
    })()
  }, [])

  if (!candidate || !questions) return null

  const psi: PsikotesResult | null = candidate.psikotes
  const cogLen = questions.cog.length || 15
  const sjtLen = questions.sjt.length || 15

  const cogColor = (v: number) => v >= Math.round(cogLen * 0.73) ? 'var(--ok)' : v >= Math.round(cogLen * 0.47) ? 'var(--hold)' : 'var(--no)'

  return (
    <div className="profile-section">
      <h3>🧠 Hasil Psikotes</h3>
      {!psi ? (
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dites</div><div className="hint">HR belum memasukkan hasil psikotes Anda.</div></div>
      ) : (
        <>
          <div className="scorecard" style={{ marginBottom: 18 }}>
            <div className="gauge">
              <svg width="128" height="128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                <circle cx="64" cy="64" r="54" fill="none" stroke={cogColor(psi.cogTotal)} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - psi.cogTotal / cogLen)} />
              </svg>
              <div className="val"><b>{psi.cogTotal}/{cogLen}</b><span>Kognitif</span></div>
            </div>
            <div className="gauge">
              <svg width="128" height="128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                <circle cx="64" cy="64" r="54" fill="none" stroke={cogColor(psi.sjtTotal)} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - psi.sjtTotal / sjtLen)} />
              </svg>
              <div className="val"><b>{psi.sjtTotal}/{sjtLen}</b><span>Integritas</span></div>
            </div>
          </div>

          <h4 className="blk">Profil Kepribadian</h4>
          {Object.entries(psi.traits).length > 0 ? (
            Object.entries(psi.traits).map(([t, val]) => (
              <div className="seg" key={t}>
                <span className="lbl">{t}</span>
                <div className="track"><i style={{ width: Math.round(val / 5 * 100) + '%', background: 'var(--violet)' }}></i></div>
                <span className="pct">{val.toFixed(1)}</span>
              </div>
            ))
          ) : (
            <div className="hint">Data profil kepribadian tidak tersedia.</div>
          )}

          <div className="verdict-line" style={{ marginTop: 12 }}>
            Kognitif: <b>{psi.cogTotal}/{cogLen}</b> · Integritas: <b>{psi.sjtTotal}/{sjtLen}</b>
            {psi.via === 'kandidat' && <span className="chip neutral" style={{ marginLeft: 8 }}>Dikerjakan mandiri</span>}
          </div>
        </>
      )}
    </div>
  )
}
