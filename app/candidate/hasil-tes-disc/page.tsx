'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import DiscResult from '@/components/results/disc-result'
import type { Candidate } from '@/lib/types'

export default function CandidateHasilTesDiscPage() {
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

  return <DiscResult disc={candidate.psikotes_result?.disc} />
}
