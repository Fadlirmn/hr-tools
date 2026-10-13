'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'
import { getCandidateByUserId, getPositions } from '@/lib/db'
import type { Candidate, Position } from '@/lib/types'
import { STAGES } from '@/lib/constants'

const STAGE_ORDER = ['screening', 'psikotes', 'interview', 'offer', 'onboarding', 'hired']

export default function CandidateDashboardPage() {
  const router = useRouter()
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

  if (!candidate) return <div className="empty"><div className="big">◦</div><div>Data tidak ditemukan</div></div>

  const stageIdx = STAGE_ORDER.indexOf(candidate.stage)
  const stageNames = Object.values(STAGES)
  const totalStages = STAGE_ORDER.length

  const posName = positions.find(p => p.id === candidate.posisi)?.name || '—'

  const cards: { label: string; hint: string; score: string; href: string }[] = [
    {
      label: '📄 Penilaian CV',
      hint: 'Skor kelayakan berkas',
      score: candidate.cv ? `${candidate.cv.percent}% · ${candidate.cv.verdict}` : 'Belum dinilai',
      href: '/candidate/hasil-cv',
    },
    {
      label: '🧩 Tes DISC',
      hint: 'Profil kepribadian 4-dimensi',
      score: (() => {
        if (candidate.psikotes_result?.disc) return `Tipe ${candidate.psikotes_result.disc.adapted.pattern.type}`
        if (candidate.disc_open_at) {
          const closeAt = new Date(candidate.disc_close_at!)
          if (closeAt < new Date()) return 'Kadaluarsa'
          return 'Tersedia — Kerjakan'
        }
        return 'Belum dibuka'
      })(),
      href: candidate.psikotes_result?.disc ? '/candidate/hasil-tes-disc' : '/candidate/tes-disc',
    },
    {
      label: '🧠 Tes IQ',
      hint: 'Pengukuran kemampuan kognitif',
      score: (() => {
        if (candidate.psikotes_result?.iq) return `${candidate.psikotes_result.iq.percent}% · ${candidate.psikotes_result.iq.category}`
        if (candidate.iq_open_at) {
          const closeAt = new Date(candidate.iq_close_at!)
          if (closeAt < new Date()) return 'Kadaluarsa'
          return 'Tersedia — Kerjakan'
        }
        return 'Belum dibuka'
      })(),
      href: candidate.psikotes_result?.iq ? '/candidate/hasil-tes-iq' : '/candidate/tes-iq',
    },
    {
      label: '🎤 Interview',
      hint: 'Penilaian wawancara',
      score: candidate.interview ? `${candidate.interview.avg.toFixed(1)}/5 · ${candidate.interview.verdict}` : 'Belum dinilai',
      href: '/candidate/hasil-interview',
    },
    {
      label: '✅ Onboarding',
      hint: 'Checklist karyawan baru',
      score: candidate.onboarding ? `${candidate.onboarding.progress}% selesai` : 'Belum mulai',
      href: '/candidate/onboarding',
    },
  ]

  return (
    <div className="cand-dash" style={{ maxWidth: 720, margin: 0 }}>
      <div className="cand-header">
        <h2>Selamat datang, {candidate.nama}</h2>
        <div className="sub">{posName} · Melamar {candidate.tanggal}</div>
        <div className="cand-progress">
          <span className="lbl">Progress</span>
          <div className="bar"><i style={{ width: Math.round(((stageIdx + 1) / totalStages) * 100) + '%' }}></i></div>
          <span className="lbl">{STAGES[candidate.stage]}</span>
        </div>
        <div className="cand-timeline">
          {STAGE_ORDER.map((s, i) => (
            <span key={s} className={`step ${i === stageIdx ? 'active' : i < stageIdx ? 'done' : ''}`}>
              {STAGES[s]}
            </span>
          ))}
        </div>
      </div>

      {cards.map(card => (
        <div key={card.href} className="cand-card" onClick={() => router.push(card.href)}>
          <div className="info">
            <h4>{card.label}</h4>
            <div className="hint">{card.hint}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{card.score}</div>
          </div>
          <div className="arrow">→</div>
        </div>
      ))}

      <div className="profile-section">
        <h3>👤 Data Diri</h3>
        <div className="detail">
          <div className="item"><div className="l">Email</div><div className="v">{candidate.email || '—'}</div></div>
          <div className="item"><div className="l">No. HP</div><div className="v">{candidate.telepon || '—'}</div></div>
          <div className="item"><div className="l">Sumber</div><div className="v">{candidate.sumber || '—'}</div></div>
          <div className="item"><div className="l">Status</div><div className="v"><span className={`stagepill s-${candidate.stage}`}>{STAGES[candidate.stage]}</span></div></div>
        </div>
      </div>
    </div>
  )
}
