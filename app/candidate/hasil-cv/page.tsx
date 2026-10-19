'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId, getPositions } from '@/lib/db'
import CvResult from '@/components/results/cv-result'
import type { Candidate, Position } from '@/lib/types'

export default function CandidateHasilCvPage() {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [positions, setPositions] = useState<Position[]>([])

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (user) {
        const c = await getCandidateByUserId(user.id)
        setCandidate(c)
      }
      setPositions(await getPositions())
    })()
  }, [])

  if (!candidate) return null

  const posName = positions.find(p => p.id === candidate.posisi)?.name || '—'

  return <CvResult cv={candidate.cv} posName={posName} />
}
