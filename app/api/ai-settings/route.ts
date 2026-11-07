import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { readStoredAiSettings, saveStoredAiSettings, loadAiConfig } from '@/lib/ai-config'
import { publicAiSettings, readEnvAiSettings, validateAiSettings, DEFAULT_MODEL } from '@/lib/ai-settings'
import { getClient, aiErrorMessage } from '@/lib/cv-screening'
import { errorMessage } from '@/lib/errors'

// Pengaturan AI — admin saja (role hr / dev). API key tidak pernah dikirim balik ke browser.

async function verifyAdmin() {
  const user = await getSessionUser()
  if (!user || (user.role !== 'hr' && user.role !== 'dev')) return null
  return user
}

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// GET /api/ai-settings → konfigurasi efektif + sumber tiap field ('db' | 'env' | 'default'), key disamarkan
export async function GET() {
  if (!(await verifyAdmin())) return forbidden()
  const stored = await readStoredAiSettings(true)
  return NextResponse.json(publicAiSettings(stored, readEnvAiSettings()))
}

// PUT /api/ai-settings { baseURL, model, apiKey, clearKey, pdfMode, enabled }
// apiKey kosong = key lama dipertahankan; clearKey: true = key dihapus dari database.
export async function PUT(req: Request) {
  const user = await verifyAdmin()
  if (!user) return forbidden()
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })

  const current = await readStoredAiSettings(true)
  const v = validateAiSettings(body, current)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    await saveStoredAiSettings(v.value, user.id)
  } catch (err) {
    const msg = errorMessage(err)
    const hint = /app_settings/.test(msg) ? ' Tabel app_settings belum ada — jalankan schema.sql terbaru.' : ''
    return NextResponse.json({ error: `Gagal menyimpan pengaturan.${hint}` }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...publicAiSettings(v.value, readEnvAiSettings()) })
}

// POST /api/ai-settings { action: 'test' } → kirim permintaan kecil ke AI dengan konfigurasi tersimpan
export async function POST(req: Request) {
  if (!(await verifyAdmin())) return forbidden()
  const body = await req.json().catch(() => null) as { action?: string } | null
  if (body?.action !== 'test') return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 })

  const cfg = await loadAiConfig()
  const model = cfg.model || DEFAULT_MODEL
  if (cfg.custom && !cfg.model) {
    return NextResponse.json({ ok: false, model: '', latencyMs: 0, error: 'Model belum diisi (wajib untuk endpoint custom / 9router).' })
  }
  if (!cfg.custom && !cfg.apiKey) {
    return NextResponse.json({ ok: false, model, latencyMs: 0, error: 'API key Anthropic belum diisi (atau isi Base URL 9router).' })
  }

  const started = Date.now()
  try {
    const res = await getClient(cfg).messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Balas: OK' }],
    }, { timeout: 30_000, maxRetries: 0 })
    const latencyMs = Date.now() - started
    const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim()
    return NextResponse.json({ ok: true, model: res.model || model, latencyMs, reply: text.slice(0, 40), error: null })
  } catch (err) {
    return NextResponse.json({ ok: false, model, latencyMs: Date.now() - started, error: aiErrorMessage(err) })
  }
}
