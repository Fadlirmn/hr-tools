import type { DiscQuestion, IqQuestion } from './types'
import { DISC_QUESTIONS as DISC_FALLBACK, IQ_QUESTIONS as IQ_FALLBACK } from './constants'

export interface ExamQuestions {
  disc: DiscQuestion[]
  iq: IqQuestion[]
}

function parseData<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as T[]
  return fallback
}

/**
 * Load exam questions via the server-side API route.
 * For candidates: answer key (field `a` for IQ) is stripped. DISC has no answer
 * key — most/least are self-reported, so full data is always returned.
 * For HR/dev: full data including IQ answer keys is returned.
 *
 * Falls back to hardcoded constants if the API call fails entirely
 * (e.g. network error) — never silently shows an empty test.
 */
export async function loadQuestions(): Promise<ExamQuestions> {
  try {
    const res = await fetch('/api/exam-questions', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return {
        disc: parseData<DiscQuestion>(data.disc, DISC_FALLBACK),
        iq: parseData<IqQuestion>(data.iq, IQ_FALLBACK),
      }
    }
  } catch {
    // network error — fall through to constants
  }
  return { disc: DISC_FALLBACK, iq: IQ_FALLBACK }
}

export async function saveQuestionType(type: 'disc' | 'iq', data: unknown[]): Promise<boolean> {
  const res = await fetch('/api/exam-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ type, data }),
  })
  return res.ok
}
