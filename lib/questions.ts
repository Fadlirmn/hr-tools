import { createClient } from './supabase'
import type { PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from './types'
import { PSI_COG as COG_FALLBACK, PSI_TRAIT as TRAIT_FALLBACK, PSI_SJT as SJT_FALLBACK } from './constants'

export interface ExamQuestions {
  cog: PsiCogQuestion[]
  trait: PsiTraitQuestion[]
  sjt: PsiSjtQuestion[]
}

function parseData<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as T[]
  return fallback
}

export async function loadQuestions(): Promise<ExamQuestions> {
  const supabase = createClient()
  const { data, error } = await supabase.from('exam_questions').select('id,type,data')

  if (error || !data) {
    return { cog: COG_FALLBACK, trait: TRAIT_FALLBACK, sjt: SJT_FALLBACK }
  }

  const cog = data.find(r => r.type === 'cog')?.data
  const trait = data.find(r => r.type === 'trait')?.data
  const sjt = data.find(r => r.type === 'sjt')?.data

  return {
    cog: parseData<PsiCogQuestion>(cog, COG_FALLBACK),
    trait: parseData<PsiTraitQuestion>(trait, TRAIT_FALLBACK),
    sjt: parseData<PsiSjtQuestion>(sjt, SJT_FALLBACK),
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
