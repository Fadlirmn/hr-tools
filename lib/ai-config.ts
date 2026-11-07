// Konfigurasi AI efektif (server-only): pengaturan di tabel app_settings (key 'ai')
// menimpa .env; field kosong ikut .env. Di-cache ~30 detik, di-reset saat disimpan.
import { query } from './pg'
import {
  mergeAiConfig, readEnvAiSettings, configReady,
  type AiConfig, type StoredAiSettings,
} from './ai-settings'

const TTL_MS = 30_000
const KEY = 'ai'

// Disimpan di globalThis agar satu cache untuk semua route bundle dalam proses yang sama.
const g = globalThis as unknown as { __aiSettingsCache?: { at: number; value: StoredAiSettings | null } }

/** Baca pengaturan AI mentah dari DB (null bila belum ada / tabel belum dibuat). */
export async function readStoredAiSettings(fresh = false): Promise<StoredAiSettings | null> {
  const c = g.__aiSettingsCache
  if (!fresh && c && Date.now() - c.at < TTL_MS) return c.value
  let value: StoredAiSettings | null = null
  try {
    const r = await query<{ value: StoredAiSettings }>('SELECT value FROM app_settings WHERE key = $1', [KEY])
    value = r.rows[0]?.value ?? null
  } catch (err) {
    // Tabel belum dimigrasi → pakai .env saja (jangan matikan fitur AI).
    console.warn('[ai-config] gagal membaca app_settings, pakai .env:', (err as Error).message)
  }
  g.__aiSettingsCache = { at: Date.now(), value }
  return value
}

export async function saveStoredAiSettings(value: StoredAiSettings, userId: string | null) {
  await query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [KEY, JSON.stringify(value), userId])
  invalidateAiConfig()
}

export function invalidateAiConfig() {
  g.__aiSettingsCache = undefined
}

export async function loadAiConfig(): Promise<AiConfig> {
  return mergeAiConfig(await readStoredAiSettings(), readEnvAiSettings())
}

export async function isAiEnabled(): Promise<boolean> {
  return configReady(await loadAiConfig())
}
