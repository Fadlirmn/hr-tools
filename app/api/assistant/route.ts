import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/auth'
import { chat, AI_OFF_WARNING, type ChatTurn } from '@/lib/assistant'
import { isAiEnabled } from '@/lib/ai-config'

// POST /api/assistant { messages: [{role, content}], context: { path, candidateId } } — HR/dev saja.
// Jawaban: { text, actions, mode: 'ai' | 'off' | 'error' }. Tanpa AI hanya peringatan, tanpa aksi. Aksi dijalankan di browser (navigasi dsb.),
// tidak ada aksi yang menyimpan penilaian atau mengubah tahap kandidat.
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null) as { messages?: ChatTurn[]; context?: { path?: string; candidateId?: string; uploaded?: unknown } } | null
  const turns = (body?.messages || [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-8).map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))
  if (!turns.length || turns[turns.length - 1].role !== 'user') return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 })
  // Percakapan harus diawali user
  while (turns.length && turns[0].role !== 'user') turns.shift()

  try {
    const ctx = body?.context || {}
    // id kandidat yang CV-nya baru diunggah di chat (maks. 10)
    const uploaded = Array.isArray(ctx.uploaded) ? ctx.uploaded.filter((x): x is string => typeof x === 'string').slice(0, 10) : []
    return NextResponse.json(await chat(turns, { path: ctx.path, candidateId: ctx.candidateId, uploaded }))
  } catch (err) {
    // AI gagal (router mati, key salah, rate limit) → beri peringatan saja, tanpa aksi
    const reason = err instanceof Anthropic.RateLimitError ? 'AI sedang sibuk, coba lagi sebentar lagi.'
      : err instanceof Anthropic.AuthenticationError ? 'API key AI tidak valid. Hubungi admin.'
      : err instanceof Anthropic.APIConnectionError ? 'Endpoint AI (9router) tidak terjangkau. Hubungi admin.'
      : 'AI sedang bermasalah, coba lagi nanti.'
    return NextResponse.json({ text: `Perintah tidak dijalankan: ${reason}`, actions: [], mode: 'error' })
  }
}

// GET /api/assistant → { aiEnabled } untuk menampilkan peringatan sebelum HR mengetik
export async function GET() {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const on = await isAiEnabled()
  return NextResponse.json({ aiEnabled: on, warning: on ? null : AI_OFF_WARNING })
}
