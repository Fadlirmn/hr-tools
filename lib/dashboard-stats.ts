// Statistik & antrian kerja Dashboard HR — fungsi murni (mudah dites).
import type { Candidate } from './types'

export type TaskKind = 'cv' | 'ai_error' | 'hold' | 'interview' | 'test_pending' | 'test_expired'

export interface Task { kind: TaskKind; id: string; nama: string; posisi: string; href: string; meta: string }

export const TASK_GROUPS: { kind: TaskKind; title: string; hint: string }[] = [
  { kind: 'cv', title: 'CV perlu dinilai', hint: 'Punya CV, belum dinilai HR' },
  { kind: 'interview', title: 'Siap interview', hint: 'Tes sudah dikerjakan, interview belum diisi' },
  { kind: 'hold', title: 'Ditahan', hint: 'Tinjau ulang dan putuskan' },
  { kind: 'test_pending', title: 'Tes online belum dikerjakan', hint: 'Akses masih aktif' },
  { kind: 'test_expired', title: 'Akses tes kedaluwarsa', hint: 'Kirim ulang akses atau lanjut tanpa tes' },
  { kind: 'ai_error', title: 'Analisis AI gagal', hint: 'Analisis ulang atau nilai manual' },
]

const enc = encodeURIComponent
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
const CLOSED = ['hired', 'rejected']

export function buildTasks(cands: Candidate[], posName: (id: string) => string, now: Date = new Date()): Task[] {
  const out: Task[] = []
  for (const c of cands) {
    const base = { id: c.id, nama: c.nama, posisi: posName(c.posisi) }
    if (c.has_cv_file && !c.cv) {
      if (c.ai_status === 'error') out.push({ ...base, kind: 'ai_error', href: `/hr/cv?candidateId=${enc(c.id)}`, meta: 'Analisis gagal' })
      else out.push({ ...base, kind: 'cv', href: `/hr/cv?candidateId=${enc(c.id)}`,
        meta: c.ai_percent != null ? `Draft AI ${c.ai_percent}%` : c.ai_status === 'processing' ? 'AI menganalisis…' : 'Tanpa draft AI' })
    }
    if (c.stage === 'hold') out.push({ ...base, kind: 'hold', href: `/hr/cv?candidateId=${enc(c.id)}`, meta: c.cv ? `CV ${c.cv.percent}%` : 'Ditahan' })
    const r = c.psikotes_result
    if ((r?.disc || r?.iq) && !c.interview && ['psikotes', 'interview'].includes(c.stage)) {
      out.push({ ...base, kind: 'interview', href: `/hr/interview?candidateId=${enc(c.id)}`,
        meta: [r?.disc && `DISC ${r.disc.adapted.pattern.type}`, r?.iq && `IQ ${r.iq.percent}%`].filter(Boolean).join(' · ') })
    }
    if (CLOSED.includes(c.stage)) continue
    for (const [t, open, close, done] of [
      ['DISC', c.disc_open_at, c.disc_close_at, !!r?.disc],
      ['IQ', c.iq_open_at, c.iq_close_at, !!r?.iq],
    ] as const) {
      if (!open || !close || done) continue
      const expired = new Date(close) < now
      out.push({ ...base, kind: expired ? 'test_expired' : 'test_pending', href: '/hr/akses-tes',
        meta: `${t} · ${expired ? 'tutup' : 'sampai'} ${fmtDate(close)}` })
    }
  }
  return out
}

export const FUNNEL = ['screening', 'psikotes', 'interview', 'offer', 'onboarding', 'hired', 'hold', 'rejected'] as const

export function buildStats(cands: Candidate[]) {
  const cnt = (s: string) => cands.filter(c => c.stage === s).length
  const sumber: Record<string, { n: number; scored: number; total: number }> = {}
  for (const c of cands) {
    const k = c.sumber || 'Lainnya'
    sumber[k] ??= { n: 0, scored: 0, total: 0 }
    sumber[k].n++
    const p = c.cv?.percent ?? c.ai_percent
    if (p != null) { sumber[k].scored++; sumber[k].total += p }
  }
  return {
    total: cands.length,
    active: cands.filter(c => !CLOSED.includes(c.stage)).length,
    cvTodo: cands.filter(c => c.has_cv_file && !c.cv).length,
    hold: cnt('hold'), hired: cnt('hired'), rejected: cnt('rejected'),
    funnel: FUNNEL.map(s => ({ stage: s, n: cnt(s) })),
    sumber: Object.entries(sumber).map(([name, v]) => ({ name, n: v.n, avg: v.scored ? Math.round(v.total / v.scored) : null }))
      .sort((a, b) => b.n - a.n),
  }
}
