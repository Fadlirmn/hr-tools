/**
 * Fetch all candidates via the server-side API route.
 * Uses service role key server-side → bypasses RLS → returns all candidates
 * regardless of browser JWT state.
 */
export async function fetchCandidates() {
  const res = await fetch('/api/candidates', { credentials: 'include' })
  if (!res.ok) return []
  const data = await res.json()
  return data.candidates ?? []
}
