import type { PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from './types'
import { PSI_COG as COG_FALLBACK, PSI_TRAIT as TRAIT_FALLBACK, PSI_SJT as SJT_FALLBACK } from './constants'
import { createClient } from './supabase'

export interface ExamQuestions {
  cog: PsiCogQuestion[]
  trait: PsiTraitQuestion[]
  sjt: PsiSjtQuestion[]
}

function parseData<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as T[]
  return fallback
}

/**
 * Load exam questions via the secure server-side API route.
 * For candidates: answer keys (field `a` for cog, scores for SJT) are stripped.
 * For HR/dev: full data including answer keys is returned.
 *
 * Falls back to constants if the API call fails (e.g., not in Next.js context).
 */
export async function loadQuestions(): Promise<ExamQuestions> {
  try {
    const res = await fetch('/api/exam-questions', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      return {
        cog: parseData<PsiCogQuestion>(data.cog, COG_FALLBACK),
        trait: parseData<PsiTraitQuestion>(data.trait, TRAIT_FALLBACK),
        sjt: parseData<PsiSjtQuestion>(data.sjt, SJT_FALLBACK),
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
      cog: parseData<PsiCogQuestion>(data.find(r => r.type === 'cog')?.data, COG_FALLBACK),
      trait: parseData<PsiTraitQuestion>(data.find(r => r.type === 'trait')?.data, TRAIT_FALLBACK),
      sjt: parseData<PsiSjtQuestion>(data.find(r => r.type === 'sjt')?.data, SJT_FALLBACK),
    }
  } catch {
    return { cog: COG_FALLBACK, trait: TRAIT_FALLBACK, sjt: SJT_FALLBACK }
  }
}

export async function saveQuestionType(type: 'cog' | 'trait' | 'sjt', data: unknown[]): Promise<boolean> {
  const supabase = createClient()
  const id = type === 'cog' ? 'psi_cog' : type === 'trait' ? 'psi_trait' : 'psi_sjt'
  const label = type === 'cog' ? 'Tes Kognitif' : type === 'trait' ? 'Profil Kepribadian' : 'Tes Situasional & Integritas'

  const { error } = await supabase.from('exam_questions').upsert(
    { id, type, label, data },
    { onConflict: 'id' }
  )

  return !error
}
