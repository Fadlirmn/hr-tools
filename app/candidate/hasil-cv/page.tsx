'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateViewByUserId, getPositions } from '@/lib/db'
import CvUpload from '@/components/cv-upload'
import { IconCheckCircle, IconClock, IconFile } from '@/components/icons'
import type { CandidateView, Position } from '@/lib/types'

const fmtDate = (d: string | null) => {
  if (!d) return null
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Kandidat hanya melihat STATUS tinjauan CV — skor, verdict, keputusan, dan
// catatan HR tidak pernah dikirim server ke kandidat (lib/candidate-public.ts).
export default function CandidateHasilCvPage() {
  const [candidate, setCandidate] = useState<CandidateView | null>(null)
  const [positions, setPositions] = useState<Position[]>([])

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (user) setCandidate(await getCandidateViewByUserId(user.id))
      setPositions(await getPositions())
    })()
  }, [])

  if (!candidate) return null

  const posName = positions.find(p => p.id === candidate.posisi)?.name || '—'
  const reviewed = candidate.cv?.reviewed === true
  const reviewedAt = fmtDate(candidate.cv?.date ?? null)
  const color = reviewed ? 'var(--ok)' : 'var(--hold)'

  return (
    <>
      <CvUpload />
      <div className="profile-section">
        <h3><IconFile size={16} /> Status CV</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ color, flexShrink: 0, marginTop: 2 }}>
            {reviewed ? <IconCheckCircle size={32} /> : <IconClock size={32} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color }}>
              {reviewed ? 'Sudah ditinjau HR' : 'Sedang diproses'}
            </div>
            <div style={{ fontSize: 13.5, marginTop: 4 }}>
              {reviewed
                ? 'Tim HR akan menghubungi kamu untuk tahap berikutnya.'
                : 'CV kamu sedang ditinjau tim HR.'}
            </div>
            <div className="seg" style={{ marginTop: 10 }}><span className="lbl">Posisi</span><b>{posName}</b></div>
            {reviewed && reviewedAt && (
              <div className="seg"><span className="lbl">Ditinjau pada</span><b>{reviewedAt}</b></div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
