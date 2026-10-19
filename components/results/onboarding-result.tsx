'use client'

import type { OnboardingProgress } from '@/lib/types'
import { ONBOARD } from '@/lib/constants'

interface Props {
  onboarding: OnboardingProgress | null | undefined
  emptyHint?: string
}

export default function OnboardingResult({ onboarding: onb, emptyHint = 'Onboarding akan dimulai ketika Anda sudah diterima.' }: Props) {
  const checklist = onb?.checklist || {}
  return (
    <div className="profile-section">
      <h3>✅ Progress Onboarding</h3>
      {!onb ? (
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum mulai</div><div className="hint">{emptyHint}</div></div>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 18 }}>
            <span className="lbl">Progress</span>
            <div className="track"><i style={{ width: onb.progress + '%', background: 'var(--ok)' }}></i></div>
            <span className="pct">{onb.progress}%</span>
          </div>

          {ONBOARD.map((grp, gi) => (
            <div key={gi}>
              <h4 className="blk">{grp.g}</h4>
              {grp.items.map((it, ii) => {
                const key = gi + '-' + ii
                const done = !!checklist[key]
                return (
                  <div key={key} className={`checkitem ${done ? 'done' : ''}`} style={{ cursor: 'default' }}>
                    <div className="cbox">{done ? '✓' : ''}</div>
                    <span className="ct">{it}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
