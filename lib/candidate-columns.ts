// Kolom tabel candidates yang boleh ditulis lewat API HR. Nama kolom di SQL dinamis
// HANYA boleh berasal dari daftar ini (nilai tetap lewat parameter $n) — mencegah SQL injection
// lewat key JSON.
export const CANDIDATE_WRITABLE = new Set([
  'user_id', 'nama', 'posisi', 'sumber', 'email', 'telepon', 'catatan', 'stage', 'tanggal', 'invite_token',
  'cv', 'psikotes', 'psikotes_open_at', 'psikotes_close_at', 'psikotes_time_limit', 'interview', 'onboarding',
  'psikotes_result', 'disc_open_at', 'disc_close_at', 'disc_time_limit', 'iq_open_at', 'iq_close_at',
  'iq_time_limit', 'disc_started_at', 'iq_started_at',
])

/** Ambil hanya field dengan nama kolom yang diizinkan (key lain dibuang). */
export function pickCandidateFields(body: Record<string, unknown>, extra: string[] = []): Record<string, unknown> {
  const allowed = new Set([...CANDIDATE_WRITABLE, ...extra])
  return Object.fromEntries(Object.entries(body || {}).filter(([k]) => allowed.has(k) && /^[a-z_]+$/.test(k)))
}
