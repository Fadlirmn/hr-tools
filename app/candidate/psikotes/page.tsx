'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId } from '@/lib/db'
import ExamModal, { type ExamTestType, type ExamResult } from '@/components/exam-modal'
import type { Candidate } from '@/lib/types'

type GateStatus = 'belum' | 'aktif' | 'kadaluarsa' | 'selesai'

function gateStatus(hasResult: boolean, openAt: string | null, closeAt: string | null, timeLimit: number | null): GateStatus {
  if (hasResult) return 'selesai'
  if (!openAt || !closeAt || !timeLimit) return 'belum'
  return new Date(closeAt) < new Date() ? 'kadaluarsa' : 'aktif'
}

export default function CandidatePsikotesPage() {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [examOpen, setExamOpen] = useState<ExamTestType | null>(null)

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
  const iqStatus = gateStatus(!!candidate.psikotes_result?.iq, candidate.iq_open_at, candidate.iq_close_at, candidate.iq_time_limit)

  // Catatan: exam-submit route sudah menyimpan hasil ke DB (hasil disertakan
  // di `res`). Di sini kita hanya perlu re-fetch untuk sinkronkan UI lokal,
  // bukan menulis lagi — exam-submit yang punya logic psikotes_result merge.
  const onSave = async (res: ExamResult | null) => {
    if (res) await load()
    setExamOpen(null)
  }

  const renderGate = (type: ExamTestType, title: string, status: GateStatus, timeLimit: number | null, closeAt: string | null) => {
    if (status === 'selesai') {
      return (
        <div className="empty"><div className="big">✓</div><div style={{ fontWeight: 700 }}>Tes sudah selesai</div>
          <div className="hint">Lihat hasilnya di halaman Hasil Psikotes.</div>
        </div>
      )
    }
    if (status === 'belum') {
      return (
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dibuka</div>
          <div className="hint">HR belum membuka akses {title} untuk Anda. Silakan tunggu atau hubungi HR.</div>
        </div>
      )
    }
    if (status === 'kadaluarsa') {
      return (
        <div className="empty"><div className="big">!</div><div style={{ fontWeight: 700 }}>Akses kedaluwarsa</div>
          <div className="hint">Batas waktu pengerjaan {title} sudah lewat ({new Date(closeAt!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}). Hubungi HR untuk informasi lebih lanjut.</div>
        </div>
      )
    }
    return (
      <>
        <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
          Akses {title} Anda telah dibuka. Anda memiliki waktu <b>{timeLimit} menit</b> untuk menyelesaikan tes.
          Batas akhir pengerjaan: <b>{new Date(closeAt!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b>.
        </p>
        <button className="btn primary" onClick={() => setExamOpen(type)} style={{ fontSize: 15, padding: '12px 32px' }}>
          Mulai {title}
        </button>
      </>
    )
  }

  return (
    <>
      <div className="profile-section">
        <h3>🧩 Tes DISC</h3>
        {renderGate('disc', 'Tes DISC', discStatus, candidate.disc_time_limit, candidate.disc_close_at)}
      </div>
      <div className="profile-section">
        <h3>🧠 Tes IQ</h3>
        {renderGate('iq', 'Tes IQ', iqStatus, candidate.iq_time_limit, candidate.iq_close_at)}
      </div>

      {examOpen && <ExamModal
        mode="candidate"
        testType={examOpen}
        candidate={candidate}
        timeLimit={examOpen === 'disc' ? candidate.disc_time_limit : candidate.iq_time_limit}
        onClose={() => setExamOpen(null)}
        onSave={onSave}
      />}
    </>
  )
}
