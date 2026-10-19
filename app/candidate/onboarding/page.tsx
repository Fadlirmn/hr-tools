'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import OnboardingResult from '@/components/results/onboarding-result'
import type { Candidate } from '@/lib/types'

export default function CandidateOnboardingPage() {
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

  return <OnboardingResult onboarding={candidate.onboarding} />
}
