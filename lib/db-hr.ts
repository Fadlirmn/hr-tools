/**
 * Fetch all candidates via the server-side API route (role-checked di sana).
 */
export async function fetchCandidates() {
  const res = await fetch('/api/candidates', { credentials: 'include' })
  if (!res.ok) return []
  const data = await res.json()
  return data.candidates ?? []
}
