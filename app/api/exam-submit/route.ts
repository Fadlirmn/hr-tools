import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PSI_COG as COG_FALLBACK, PSI_TRAIT as TRAIT_FALLBACK, PSI_SJT as SJT_FALLBACK } from '@/lib/constants'
import type { PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from '@/lib/types'

/**
 * POST /api/exam-submit
 *
 * Accepts raw candidate answers, fetches the answer key server-side,
 * computes the score, and saves the result to the candidates table.
 *
 * Body: { candidateId: string, cog: Record<number,number>, trait: Record<number,number>, sjt: Record<number,number> }
 */
export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.user_metadata?.role ?? ''
  const isCandidate = role === 'candidate'
  const isHr = role === 'hr' || role === 'dev'

  if (!isCandidate && !isHr) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { candidateId, cog, trait, sjt } = body as {
    candidateId: string | null
    cog: Record<number, number>
    trait: Record<number, number>
    sjt: Record<number, number>
  }

  // Fetch full questions with answer keys (server-side, never exposed to browser)
  const { data: qData } = await supabase.from('exam_questions').select('id,type,data')

  function parseData<T>(raw: unknown, fallback: T[]): T[] {
    if (Array.isArray(raw) && raw.length > 0) return raw as T[]
    return fallback
  }

  const PSI_COG = parseData<PsiCogQuestion>(qData?.find(r => r.type === 'cog')?.data, COG_FALLBACK)
  const PSI_TRAIT = parseData<PsiTraitQuestion>(qData?.find(r => r.type === 'trait')?.data, TRAIT_FALLBACK)
  const PSI_SJT = parseData<PsiSjtQuestion>(qData?.find(r => r.type === 'sjt')?.data, SJT_FALLBACK)

  // Score computation (server-side — answer keys never leave the server)
  // NOTE: JSON.parse always produces string keys, so we compare using Number(i)
  let cogTotal = 0
  PSI_COG.forEach((it, i) => { if (Number(cog[i]) === it.a) cogTotal++ })

  let sjtTotal = 0
  PSI_SJT.forEach((it, i) => {
    const chosen = sjt[i] != null ? Number(sjt[i]) : null
    if (chosen != null && it.o[chosen]) sjtTotal += it.o[chosen][1]
  })

  const traitMap: Record<string, { sum: number; cnt: number }> = {}
  PSI_TRAIT.forEach((it, i) => {
    if (trait[i]) {
      if (!traitMap[it.t]) traitMap[it.t] = { sum: 0, cnt: 0 }
      traitMap[it.t].sum += trait[i]
      traitMap[it.t].cnt++
    }
  })
  const traits: Record<string, number> = {}
  Object.entries(traitMap).forEach(([k, v]) => { traits[k] = v.cnt ? v.sum / v.cnt : 0 })

  const via = isCandidate ? 'kandidat' : 'hr'
  const result = {
    cogTotal,
    sjtTotal,
    traits,
    cog: { ...cog },
    trait: { ...trait },
    sjt: { ...sjt },
    date: new Date().toISOString().slice(0, 10),
    via,
    candidateId: candidateId ?? null,
  }

  if (candidateId) {
    // Update the candidate record
    const nextStage = isCandidate ? { stage: 'interview' } : {}
    const { error } = await supabase
      .from('candidates')
      .update({ psikotes: result as any, ...nextStage })
      .eq('id', candidateId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, result })
}
