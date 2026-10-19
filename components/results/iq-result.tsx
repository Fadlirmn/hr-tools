'use client'

import type { IqResult as IqResultData } from '@/lib/types'

interface Props {
  iq: IqResultData | null | undefined
  emptyHint?: string
  showMeta?: boolean
}

const categoryColor = (cat: string) => cat === 'Tinggi' ? 'var(--ok)' : cat === 'Rata-rata' ? 'var(--hold)' : 'var(--no)'

export default function IqResult({ iq, emptyHint = 'HR belum memasukkan hasil Tes IQ Anda.', showMeta = false }: Props) {
  return (
    <div className="profile-section">
      <h3>🧠 Hasil Tes IQ</h3>
      {!iq ? (
        <div className="empty"><div className="big">◦</div><div style={{ fontWeight: 700 }}>Belum dites</div><div className="hint">{emptyHint}</div></div>
      ) : (
        <>
          <div className="scorecard" style={{ marginBottom: 18 }}>
            <div className="gauge">
              <svg width="128" height="128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" strokeWidth="12" />
                <circle cx="64" cy="64" r="54" fill="none" stroke={categoryColor(iq.category)} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - iq.percent / 100)} />
              </svg>
              <div className="val"><b>{iq.correct}/{iq.total}</b><span>{iq.percent}%</span></div>
            </div>
            {showMeta && (
              <div>
                <div className="seg"><span className="lbl">Tanggal</span><b>{iq.date || '—'}</b></div>
                <div className="seg"><span className="lbl">Dikerjakan</span><b>{iq.via === 'kandidat' ? 'Mandiri oleh kandidat' : 'Diinput HR'}</b></div>
              </div>
            )}
          </div>
          <div className="verdict-line">
            Kategori: <b>{iq.category}</b>
            {!showMeta && iq.via === 'kandidat' && <span className="chip neutral" style={{ marginLeft: 8 }}>Dikerjakan mandiri</span>}
          </div>
        </>
      )}
    </div>
  )
}
