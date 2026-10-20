/**
 * Perhitungan batas waktu tes di sisi server (sumber kebenaran).
 * Client hanya menampilkan countdown berdasarkan sisa detik yang dikirim server.
 */
export type ExamType = 'disc' | 'iq'

/** Toleransi (detik) untuk latency jaringan saat submit otomatis tepat di detik terakhir. */
export const SUBMIT_GRACE_SEC = 30

export interface ExamWindowRow {
  open_at: string | Date | null
  close_at: string | Date | null
  time_limit: number | null
  started_at: string | Date | null
}

export function examColumns(type: ExamType) {
  return {
    openAt: `${type}_open_at`,
    closeAt: `${type}_close_at`,
    timeLimit: `${type}_time_limit`,
    startedAt: `${type}_started_at`,
  }
}

function toMs(v: string | Date | null): number | null {
  if (!v) return null
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * Deadline absolut (ms epoch) = min(started_at + time_limit, close_at).
 * null jika tes belum dimulai atau akses belum lengkap.
 */
export function computeDeadlineMs(row: ExamWindowRow): number | null {
  const started = toMs(row.started_at)
  const closeAt = toMs(row.close_at)
  if (started == null || !row.time_limit || row.time_limit <= 0) return null
  const byLimit = started + row.time_limit * 60 * 1000
  return closeAt != null ? Math.min(byLimit, closeAt) : byLimit
}

export function remainingSeconds(row: ExamWindowRow, nowMs: number): number | null {
  const dl = computeDeadlineMs(row)
  if (dl == null) return null
  return Math.max(0, Math.ceil((dl - nowMs) / 1000))
}

/** Akses dibuka HR dan sekarang berada di dalam jendela open_at..close_at. */
export function isWindowOpen(row: ExamWindowRow, nowMs: number): boolean {
  const open = toMs(row.open_at)
  const close = toMs(row.close_at)
  if (open == null || close == null || !row.time_limit) return false
  return nowMs >= open && nowMs <= close
}
