'use client'

import Link from 'next/link'
import { IconMonitor } from './icons'

/** Tab "Tes di PC HRD": pindah antar tes tanpa kehilangan kandidat terpilih. */
export default function LocalTestTabs({ active, candidateId }: { active: 'disc' | 'iq'; candidateId: string }) {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : ''
  return (
    <div className="lt-tabs no-print">
      <span className="lt-title"><IconMonitor size={16} />Tes di PC HRD</span>
      <nav className="lt-links" aria-label="Jenis tes">
        <Link href={`/hr/tes-disc${q}`} aria-current={active === 'disc' ? 'page' : undefined}>Tes DISC</Link>
        <Link href={`/hr/tes-iq${q}`} aria-current={active === 'iq' ? 'page' : undefined}>Tes IQ</Link>
      </nav>
      <span className="hint">Kandidat mengerjakan langsung di komputer HR. Untuk tes dari perangkat kandidat, pakai menu Akses Tes Online.</span>
    </div>
  )
}
