'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchCandidates } from '@/lib/db-hr'
import { getPositions } from '@/lib/db'
import { STAGES } from '@/lib/constants'
import CvResult from '@/components/results/cv-result'
import DiscResult from '@/components/results/disc-result'
import IqResult from '@/components/results/iq-result'
import InterviewResult from '@/components/results/interview-result'
import OnboardingResult from '@/components/results/onboarding-result'
import type { Candidate, Position } from '@/lib/types'

export default function HrCandidateDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [cands, pos] = await Promise.all([fetchCandidates(), getPositions()])
      setCandidate((cands as Candidate[]).find(c => c.id === id) || null)
      setPositions(pos)
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="hint">Memuat...</div>

  if (!candidate) {
    return (
      <div className="card card-p">
        <div className="empty">
          <div className="big">◦</div>
          <div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Kandidat tidak ditemukan</div>
          <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => router.push('/hr/candidates')}>← Kembali ke daftar</button>
        </div>
      </div>
    )
  }

  const c = candidate
  const posName = positions.find(p => p.id === c.posisi)?.name || '—'
  const disc = c.psikotes_result?.disc
  const iq = c.psikotes_result?.iq

  return (
    <>
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <button className="btn ghost sm no-print" style={{ marginBottom: 8 }} onClick={() => router.push('/hr/candidates')}>← Kembali</button>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{c.nama}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`stagepill s-${c.stage}`}>{STAGES[c.stage]}</span>
              <span className="hint">{posName}</span>
              <span className="hint">· Sumber: {c.sumber || '—'}</span>
              <span className="hint">· Masuk: {c.tanggal || '—'}</span>
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost sm" onClick={() => router.push(`/hr/cv?candidateId=${c.id}`)}>Nilai CV</button>
            <button className="btn ghost sm" onClick={() => router.push(`/hr/tes-disc?candidateId=${c.id}`)}>Form Tes DISC</button>
            <button className="btn ghost sm" onClick={() => router.push(`/hr/tes-iq?candidateId=${c.id}`)}>Form Tes IQ</button>
          </div>
        </div>

        <div className="detail-grid" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          <div className="item"><div className="l">Email</div><div className="v">{c.email || '—'}</div></div>
          <div className="item"><div className="l">Telepon</div><div className="v">{c.telepon || '—'}</div></div>
          <div className="item" style={{ gridColumn: '1 / -1' }}><div className="l">Catatan</div><div className="v" style={{ fontWeight: 500 }}>{c.catatan || '—'}</div></div>
        </div>
      </div>

      <div className="card card-p summary-card">
        <h4 className="blk" style={{ margin: '0 0 12px' }}>Ringkasan</h4>
        <div className="summary-grid">
          <div className="item"><div className="l">CV</div><div className="v">{c.cv ? `${c.cv.percent}%` : '—'}</div><div className="s">{c.cv?.verdict || 'Belum dinilai'}</div></div>
          <div className="item"><div className="l">DISC</div><div className="v">{disc ? disc.adapted.pattern.type : '—'}</div><div className="s">{disc ? disc.adapted.pattern.name : 'Belum dites'}</div></div>
          <div className="item"><div className="l">IQ</div><div className="v">{iq ? `${iq.percent}%` : '—'}</div><div className="s">{iq ? iq.category : 'Belum dites'}</div></div>
          <div className="item"><div className="l">Interview</div><div className="v">{c.interview ? c.interview.avg.toFixed(1) : '—'}</div><div className="s">{c.interview?.verdict || 'Belum dinilai'}</div></div>
          <div className="item"><div className="l">Onboarding</div><div className="v">{c.onboarding ? `${c.onboarding.progress}%` : '—'}</div><div className="s">{c.onboarding ? 'Progress' : 'Belum mulai'}</div></div>
        </div>
      </div>

      <CvResult cv={c.cv} posName={posName} emptyHint="Belum ada penilaian CV untuk kandidat ini." />
      <DiscResult disc={disc} showMeta emptyHint="Kandidat belum mengerjakan Tes DISC." />
      <IqResult iq={iq} showMeta emptyHint="Kandidat belum mengerjakan Tes IQ." />
      <InterviewResult interview={c.interview} emptyHint="Belum ada penilaian interview untuk kandidat ini." />
      <OnboardingResult onboarding={c.onboarding} emptyHint="Onboarding belum dimulai." />
    </>
  )
}
