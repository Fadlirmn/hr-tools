'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import ExamModal, { type ExamResult } from '@/components/exam-modal'
import TestGate, { gateStatus } from '@/components/test-gate'
import type { Candidate } from '@/lib/types'

export default function CandidateTesDiscPage() {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [examOpen, setExamOpen] = useState(false)

  const load = async () => {
    const user = await getCurrentUser()
    if (user) {
      const c = await getCandidateByUserId(user.id)
      setCandidate(c)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return null
  if (!candidate) return <div className="empty"><div className="big">◦</div><div>Data tidak ditemukan</div></div>

  const discStatus = gateStatus(!!candidate.psikotes_result?.disc, candidate.disc_open_at, candidate.disc_close_at, candidate.disc_time_limit)

  // exam-submit sudah menyimpan hasil ke DB; di sini cukup re-fetch untuk sinkronkan UI.
  const onSave = async (res: ExamResult | null) => {
    if (res) await load()
    setExamOpen(false)
  }

  return (
    <div className="profile-section">
      {!examOpen && <h3>🧩 Tes DISC</h3>}
      {!examOpen && <TestGate
        title="Tes DISC"
        status={discStatus}
        timeLimit={candidate.disc_time_limit}
        closeAt={candidate.disc_close_at}
        resultHref="/candidate/hasil-tes-disc"
        onStart={() => setExamOpen(true)}
      />}

      {examOpen && <ExamModal
        mode="candidate"
        testType="disc"
        candidate={candidate}
        timeLimit={candidate.disc_time_limit}
        onClose={() => setExamOpen(false)}
        onSave={onSave}
      />}
    </div>
  )
}
