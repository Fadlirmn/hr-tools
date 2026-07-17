'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCandidateByUserId } from '@/lib/db'
import ExamModal from '@/components/exam-modal'
import type { Candidate } from '@/lib/types'

export default function CandidatePsikotesPage() {
  const supabase = createClient()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [examOpen, setExamOpen] = useState(false)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const c = await getCandidateByUserId(user.id)
      setCandidate(c)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return null

  if (!candidate) return <div className="empty"><div className="big">◦</div><div>Data tidak ditemukan</div></div>

  if (candidate.psikotes) {
    return (
      <div className="profile-section">
        <h3>🧠 Psikotes</h3>
        <div className="empty"><div className="big">✓</div><div style={{ fontWeight: 700 }}>Tes sudah selesai</div>
          <div className="hint">Anda sudah mengerjakan psikotes. Lihat hasilnya di halaman Hasil Psikotes.</div>
        </div>
      </div>
    )
  }

  const now = new Date()

  if (!candidate.psikotes_open_at || !candidate.psikotes_close_at || !candidate.psikotes_time_limit) {
    return (
      <div className="profile-section">
        <h3>🧠 Psikotes</h3>
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dibuka</div>
          <div className="hint">HR belum membuka akses psikotes untuk Anda. Silakan tunggu atau hubungi HR.</div>
        </div>
      </div>
    )
  }

  const closeAt = new Date(candidate.psikotes_close_at)

  if (closeAt < now) {
    return (
      <div className="profile-section">
        <h3>🧠 Psikotes</h3>
        <div className="empty"><div className="big">!</div><div style={{ fontWeight: 700 }}>Akses kedaluwarsa</div>
          <div className="hint">Batas waktu pengerjaan psikotes sudah lewat ({closeAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}). Hubungi HR untuk informasi lebih lanjut.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-section">
      <h3>🧠 Psikotes</h3>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Akses psikotes Anda telah dibuka. Anda memiliki waktu <b>{candidate.psikotes_time_limit} menit</b> untuk menyelesaikan tes.
        Batas akhir pengerjaan: <b>{closeAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b>.
      </p>
      <div className="notice" style={{ marginBottom: 16 }}>
        Pastikan Anda dalam keadaan siap dan tidak terganggu. Tes terdiri dari 3 bagian: Kognitif, Kepribadian, dan Situasional.
        Timer akan berjalan otomatis setelah tes dimulai.
      </div>
      <button className="btn primary" onClick={() => setExamOpen(true)} style={{ fontSize: 15, padding: '12px 32px' }}>
        Mulai Psikotes
      </button>

      {examOpen && <ExamModal
        mode="candidate"
        candidate={candidate}
        timeLimit={candidate.psikotes_time_limit}
        onClose={() => setExamOpen(false)}
        onSave={async (res) => {
          if (res) {
            await supabase.from('candidates').update({
              psikotes: res as any,
              stage: 'interview',
            }).eq('id', candidate.id)
            setCandidate(prev => prev ? { ...prev, psikotes: res } : prev)
          }
          setExamOpen(false)
        }}
      />}
    </div>
  )
}
