'use client'

export type GateStatus = 'belum' | 'aktif' | 'kadaluarsa' | 'selesai'

export function gateStatus(hasResult: boolean, openAt: string | null, closeAt: string | null, timeLimit: number | null): GateStatus {
  if (hasResult) return 'selesai'
  if (!openAt || !closeAt || !timeLimit) return 'belum'
  return new Date(closeAt) < new Date() ? 'kadaluarsa' : 'aktif'
}

interface TestGateProps {
  title: string
  status: GateStatus
  timeLimit: number | null
  closeAt: string | null
  resultHref: string
  onStart: () => void
}

export default function TestGate({ title, status, timeLimit, closeAt, resultHref, onStart }: TestGateProps) {
  if (status === 'selesai') {
    return (
      <div className="empty"><div className="big">✓</div><div style={{ fontWeight: 700 }}>Tes sudah selesai</div>
        <div className="hint">Lihat hasilnya di halaman <a href={resultHref} style={{ color: 'var(--violet)', fontWeight: 700 }}>Hasil {title}</a>.</div>
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
      <button className="btn primary" onClick={onStart} style={{ fontSize: 15, padding: '12px 32px' }}>
        Mulai {title}
      </button>
    </>
  )
}
