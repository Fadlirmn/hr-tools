import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { DISC_QUESTIONS as DISC_FALLBACK, IQ_QUESTIONS as IQ_FALLBACK } from '@/lib/constants'
import type { DiscQuestion, IqQuestion } from '@/lib/types'

/**
 * GET /api/exam-questions
 *
 * Returns DISC blocks and IQ questions.
 * DISC has no answer key (most/least are self-reported) — full data always returned.
 * IQ answer key (field `a`) is STRIPPED for candidates; HR/dev get full data.
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
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.user_metadata?.role ?? 'candidate'
  const isHr = role === 'hr' || role === 'dev'

  const { data } = await supabase.from('exam_questions').select('id,type,data')

  function parseData<T>(raw: unknown, fallback: T[]): T[] {
    if (Array.isArray(raw) && raw.length > 0) return raw as T[]
    return fallback
  }

  const discRaw = parseData<DiscQuestion>(data?.find(r => r.type === 'disc')?.data, DISC_FALLBACK)
  const iqRaw = parseData<IqQuestion>(data?.find(r => r.type === 'iq')?.data, IQ_FALLBACK)

  if (isHr) {
    return NextResponse.json({ disc: discRaw, iq: iqRaw })
  }

  // Candidate: strip IQ answer key before sending. DISC has no key to strip.
  const iqSafe = iqRaw.map(({ a: _a, ...rest }) => rest)

  return NextResponse.json({ disc: discRaw, iq: iqSafe })
}
