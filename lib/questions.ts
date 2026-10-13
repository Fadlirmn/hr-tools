import type { DiscQuestion, IqQuestion } from './types'
import { DISC_QUESTIONS as DISC_FALLBACK, IQ_QUESTIONS as IQ_FALLBACK } from './constants'
import { createClient } from './supabase'

export interface ExamQuestions {
  disc: DiscQuestion[]
  iq: IqQuestion[]
}

function parseData<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as T[]
  return fallback
}

/**
 * Load exam questions via the secure server-side API route.
 * For candidates: answer key (field `a` for IQ) is stripped. DISC has no answer
 * key — most/least are self-reported, so full data is always returned.
 * For HR/dev: full data including IQ answer keys is returned.
 *
 * Falls back to constants if the API call fails (e.g., not in Next.js context).
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
    // 401 = no session yet (cookie not propagated) — fall through to direct fetch
    // 4xx/5xx other — also fall through
  } catch {
    // network error — fall through
  }

  // Fallback: direct Supabase fetch
  // Safe for HR (RLS allows their reads); candidates without session can't access exam_questions anyway.
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('exam_questions').select('id,type,data')
    if (error || !data) throw new Error('supabase error')
    return {
      disc: parseData<DiscQuestion>(data.find(r => r.type === 'disc')?.data, DISC_FALLBACK),
      iq: parseData<IqQuestion>(data.find(r => r.type === 'iq')?.data, IQ_FALLBACK),
    }
  } catch {
    return { disc: DISC_FALLBACK, iq: IQ_FALLBACK }
  }
}

export async function saveQuestionType(type: 'disc' | 'iq', data: unknown[]): Promise<boolean> {
  const supabase = createClient()
  const id = type === 'disc' ? 'disc_blocks' : 'iq_questions'
  const label = type === 'disc' ? 'Tes DISC' : 'Tes IQ'

  const { error } = await supabase.from('exam_questions').upsert(
    { id, type, label, data },
    { onConflict: 'id' }
  )

  return !error
}
