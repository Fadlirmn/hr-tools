import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PSI_COG as COG_FALLBACK, PSI_TRAIT as TRAIT_FALLBACK, PSI_SJT as SJT_FALLBACK } from '@/lib/constants'
import type { PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion } from '@/lib/types'

/**
 * GET /api/exam-questions
 *
 * Returns exam questions with the answer key STRIPPED for candidates.
 * HR/dev get the full data (including answer key) for the admin exam runner.
 *
 * Cognitive (cog): field `a` (correct answer index) is removed for candidates.
 * SJT: field `o[n][1]` (score per option) is removed for candidates.
 * Trait: no answer key — returned as-is for all roles.
 */
export async function GET() {
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

  // If no session: return 401 so caller (loadQuestions) can use fallback with constants
  // This prevents HR with a stale/missing cookie from getting stripped questions
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.user_metadata?.role ?? 'candidate'
  const isHr = role === 'hr' || role === 'dev'

  // Fetch from DB
  const { data } = await supabase.from('exam_questions').select('id,type,data')

  function parseData<T>(raw: unknown, fallback: T[]): T[] {
    if (Array.isArray(raw) && raw.length > 0) return raw as T[]
    return fallback
  }

  const cogRaw = parseData<PsiCogQuestion>(data?.find(r => r.type === 'cog')?.data, COG_FALLBACK)
  const traitRaw = parseData<PsiTraitQuestion>(data?.find(r => r.type === 'trait')?.data, TRAIT_FALLBACK)
  const sjtRaw = parseData<PsiSjtQuestion>(data?.find(r => r.type === 'sjt')?.data, SJT_FALLBACK)

  if (isHr) {
    // HR / dev: return full data including answer keys
    return NextResponse.json({ cog: cogRaw, trait: traitRaw, sjt: sjtRaw })
  }

  // Candidate: strip answer keys before sending
  const cogSafe = cogRaw.map(({ a: _a, ...rest }) => rest) // remove `a` (correct answer)
  const sjtSafe = sjtRaw.map(q => ({
    ...q,
    o: q.o.map(([text]: [string, number]) => [text]), // keep only option text, drop score
  }))

  return NextResponse.json({ cog: cogSafe, trait: traitRaw, sjt: sjtSafe })
}
