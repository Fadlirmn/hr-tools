// Logika murni pengaturan AI (tanpa DB) — dipakai server & unit test.
// Urutan prioritas per field: nilai di database (halaman Pengaturan AI) → .env → default.
// Field kosong di database = ikut .env.

export const DEFAULT_MODEL = 'claude-opus-5-5'

export type PdfMode = 'text' | 'document'
export type ConfigSource = 'db' | 'env' | 'default'

/** Bentuk yang disimpan di app_settings (key = 'ai'). Semua opsional. */
export interface StoredAiSettings {
  baseURL?: string
  model?: string
  apiKey?: string
  pdfMode?: PdfMode | ''
  enabled?: boolean
}

export interface EnvAiSettings {
  baseURL: string
  model: string
  /** Key untuk endpoint custom (CV_AI_API_KEY / NINEROUTER_API_KEY). */
  routerKey: string
  /** Key Anthropic langsung (ANTHROPIC_API_KEY). */
  anthropicKey: string
  pdfMode: PdfMode | ''
}

export interface AiConfig {
  /** true = endpoint custom (mis. 9router); false = langsung ke Anthropic API. */
  custom: boolean
  baseURL: string
  model: string
  apiKey: string
  pdfMode: PdfMode
  /** Saklar aktif/nonaktif dari halaman Pengaturan AI (default aktif). */
  enabled: boolean
  sources: Record<'baseURL' | 'model' | 'apiKey' | 'pdfMode' | 'enabled', ConfigSource>
}

/** Buang slash di akhir dan akhiran /v1 (SDK Anthropic menambahkan /v1 sendiri). */
export function normalizeBaseURL(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
}

export function readEnvAiSettings(env: Record<string, string | undefined> = process.env): EnvAiSettings {
  // Nama NINEROUTER_* diterima juga (konvensi yang dipakai project lain).
  const pick = (a: string, b?: string) => (env[a] || (b ? env[b] : '') || '').trim()
  const pdf = pick('CV_AI_PDF_MODE')
  return {
    baseURL: normalizeBaseURL(pick('CV_AI_BASE_URL', 'NINEROUTER_URL')),
    model: pick('CV_AI_MODEL', 'NINEROUTER_MODEL'),
    routerKey: pick('CV_AI_API_KEY', 'NINEROUTER_API_KEY'),
    anthropicKey: pick('ANTHROPIC_API_KEY'),
    pdfMode: pdf === 'document' || pdf === 'text' ? pdf : '',
  }
}

/** Gabungkan pengaturan database di atas .env. */
export function mergeAiConfig(db: StoredAiSettings | null | undefined, env: EnvAiSettings): AiConfig {
  const d = db || {}
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const dbBase = normalizeBaseURL(s(d.baseURL))
  const baseURL = dbBase || env.baseURL
  const custom = !!baseURL
  const sources = {} as AiConfig['sources']
  sources.baseURL = dbBase ? 'db' : env.baseURL ? 'env' : 'default'

  const envKey = custom ? env.routerKey : env.anthropicKey
  const dbKey = s(d.apiKey)
  const apiKey = dbKey || envKey
  sources.apiKey = dbKey ? 'db' : envKey ? 'env' : 'default'

  const dbModel = s(d.model)
  let model = dbModel || env.model
  sources.model = dbModel ? 'db' : env.model ? 'env' : 'default'
  if (!model && !custom) model = DEFAULT_MODEL

  const dbPdf = d.pdfMode === 'text' || d.pdfMode === 'document' ? d.pdfMode : ''
  const pdfMode: PdfMode = dbPdf || env.pdfMode || 'text'
  sources.pdfMode = dbPdf ? 'db' : env.pdfMode ? 'env' : 'default'

  const enabled = typeof d.enabled === 'boolean' ? d.enabled : true
  sources.enabled = typeof d.enabled === 'boolean' ? 'db' : 'default'

  return { custom, baseURL, model, apiKey, pdfMode, enabled, sources }
}

/** AI siap dipakai: saklar aktif + endpoint custom punya model, atau mode Anthropic punya key. */
export function configReady(cfg: AiConfig): boolean {
  if (!cfg.enabled) return false
  return cfg.custom ? !!cfg.model : !!cfg.apiKey
}

/** Samarkan API key: hanya 4 karakter terakhir yang terlihat. */
export function maskKey(key: string | null | undefined): string {
  const k = (key || '').trim()
  if (!k) return ''
  if (k.length <= 8) return '••••'
  return '••••' + k.slice(-4)
}

export interface AiSettingsInput {
  baseURL?: unknown
  model?: unknown
  apiKey?: unknown
  clearKey?: unknown
  pdfMode?: unknown
  enabled?: unknown
}

/**
 * Validasi input PUT lalu hasilkan pengaturan baru untuk disimpan.
 * apiKey kosong = key lama dipertahankan; clearKey: true = key dihapus.
 */
export function validateAiSettings(input: AiSettingsInput, current: StoredAiSettings | null | undefined):
  { ok: true; value: StoredAiSettings } | { ok: false; error: string } {
  const cur = current || {}
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : null)

  const baseURL = str(input.baseURL)
  if (baseURL === null) return { ok: false, error: 'Base URL harus berupa teks.' }
  if (baseURL) {
    let u: URL
    try { u = new URL(baseURL) } catch { return { ok: false, error: 'Base URL tidak valid. Contoh: http://localhost:20128' } }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, error: 'Base URL harus diawali http:// atau https://' }
    if (baseURL.length > 500) return { ok: false, error: 'Base URL terlalu panjang.' }
  }

  const model = str(input.model)
  if (model === null) return { ok: false, error: 'Model harus berupa teks.' }
  if (model.length > 200) return { ok: false, error: 'Nama model terlalu panjang.' }

  const pdfMode = str(input.pdfMode)
  if (pdfMode === null || (pdfMode !== '' && pdfMode !== 'text' && pdfMode !== 'document')) {
    return { ok: false, error: "Mode PDF harus 'text' atau 'document'." }
  }

  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') {
    return { ok: false, error: 'Status aktif harus true/false.' }
  }

  const newKey = str(input.apiKey)
  if (newKey === null) return { ok: false, error: 'API key harus berupa teks.' }
  if (newKey.length > 500) return { ok: false, error: 'API key terlalu panjang.' }
  const apiKey = input.clearKey === true ? '' : newKey || (cur.apiKey || '')

  const value: StoredAiSettings = {
    baseURL: baseURL ? normalizeBaseURL(baseURL) : '',
    model,
    pdfMode: pdfMode as PdfMode | '',
    enabled: typeof input.enabled === 'boolean' ? input.enabled : (typeof cur.enabled === 'boolean' ? cur.enabled : true),
  }
  if (apiKey) value.apiKey = apiKey
  return { ok: true, value }
}

/** Respons GET untuk halaman Pengaturan AI — key tidak pernah dikirim. */
export function publicAiSettings(db: StoredAiSettings | null | undefined, env: EnvAiSettings) {
  const cfg = mergeAiConfig(db, env)
  const d = db || {}
  return {
    effective: {
      mode: cfg.custom ? 'custom' as const : 'anthropic' as const,
      baseURL: cfg.baseURL,
      model: cfg.model,
      pdfMode: cfg.pdfMode,
      enabled: cfg.enabled,
      ready: configReady(cfg),
      hasKey: !!cfg.apiKey,
      keyMasked: maskKey(cfg.apiKey),
    },
    sources: cfg.sources,
    // Nilai yang tersimpan di DB (untuk mengisi form); key hanya tanda ada/tidak.
    saved: {
      baseURL: d.baseURL || '',
      model: d.model || '',
      pdfMode: d.pdfMode || '',
      enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
      hasKey: !!d.apiKey,
      keyMasked: maskKey(d.apiKey),
    },
    env: {
      baseURL: env.baseURL,
      model: env.model,
      pdfMode: env.pdfMode,
      hasKey: !!(cfg.custom ? env.routerKey : env.anthropicKey),
    },
  }
}
