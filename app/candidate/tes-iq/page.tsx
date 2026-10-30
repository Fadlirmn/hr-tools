'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import ExamModal, { type ExamResult } from '@/components/exam-modal'
import TestGate, { gateStatus } from '@/components/test-gate'
import type { Candidate } from '@/lib/types'

export default function CandidateTesIqPage() {
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

  useEffect(() => {
    ;(async () => { await load() })()
  }, [])

  if (loading) return null
  if (!candidate) return <div className="empty"><div className="big">◦</div><div>Data tidak ditemukan</div></div>

  const iqStatus = gateStatus(!!candidate.psikotes_result?.iq, candidate.iq_open_at, candidate.iq_close_at, candidate.iq_time_limit)

  // exam-submit sudah menyimpan hasil ke DB; di sini cukup re-fetch untuk sinkronkan UI.
  const onSave = async (res: ExamResult | null) => {
    if (res) await load()
    setExamOpen(false)
  }

  return (
    <div className="profile-section">
      {!examOpen && <h3>🧠 Tes IQ</h3>}
      {!examOpen && <TestGate
        title="Tes IQ"
        status={iqStatus}
        timeLimit={candidate.iq_time_limit}
        closeAt={candidate.iq_close_at}
        resultHref="/candidate/hasil-tes-iq"
        onStart={() => setExamOpen(true)}
      />}

      {examOpen && <ExamModal
        mode="candidate"
        testType="iq"
        candidate={candidate}
        timeLimit={candidate.iq_time_limit}
        onClose={() => setExamOpen(false)}
        onSave={onSave}
      />}
    </div>
  )
}
