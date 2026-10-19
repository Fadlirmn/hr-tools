'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import InterviewResult from '@/components/results/interview-result'
import type { Candidate } from '@/lib/types'

export default function CandidateHasilInterviewPage() {
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

  return <InterviewResult interview={candidate.interview} />
}
