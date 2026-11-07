import { describe, it, expect } from 'vitest'
import {
  mergeAiConfig, readEnvAiSettings, maskKey, validateAiSettings, configReady, normalizeBaseURL,
  publicAiSettings, DEFAULT_MODEL, type EnvAiSettings,
} from './ai-settings'

const noEnv: EnvAiSettings = { baseURL: '', model: '', routerKey: '', anthropicKey: '', pdfMode: '' }
const routerEnv: EnvAiSettings = { baseURL: 'http://router:20128', model: 'cc/env-model', routerKey: 'env-router-key-1234', anthropicKey: 'sk-ant-env-9999', pdfMode: 'document' }

describe('readEnvAiSettings', () => {
  it('membaca CV_AI_* dan alias NINEROUTER_*, menormalkan base URL', () => {
    expect(readEnvAiSettings({ NINEROUTER_URL: 'http://x:1/v1/', NINEROUTER_MODEL: 'm', NINEROUTER_API_KEY: 'k', CV_AI_PDF_MODE: 'bogus' }))
      .toEqual({ baseURL: 'http://x:1', model: 'm', routerKey: 'k', anthropicKey: '', pdfMode: '' })
    expect(readEnvAiSettings({ CV_AI_BASE_URL: 'http://a', NINEROUTER_URL: 'http://b', ANTHROPIC_API_KEY: ' sk ' }).baseURL).toBe('http://a')
  })
})

describe('normalizeBaseURL', () => {
  it('buang slash & /v1', () => {
    expect(normalizeBaseURL(' http://h:1/v1/ ')).toBe('http://h:1')
    expect(normalizeBaseURL('https://h/api/')).toBe('https://h/api')
  })
})

describe('mergeAiConfig', () => {
  it('tanpa DB: semua dari env', () => {
    const c = mergeAiConfig(null, routerEnv)
    expect(c).toMatchObject({ custom: true, baseURL: 'http://router:20128', model: 'cc/env-model', apiKey: 'env-router-key-1234', pdfMode: 'document', enabled: true })
    expect(c.sources).toEqual({ baseURL: 'env', model: 'env', apiKey: 'env', pdfMode: 'env', enabled: 'default' })
  })

  it('DB menimpa env per field; field kosong ikut env', () => {
    const c = mergeAiConfig({ baseURL: '', model: 'db-model', apiKey: 'db-key-abcd', pdfMode: '', enabled: false }, routerEnv)
    expect(c.baseURL).toBe('http://router:20128')
    expect(c.model).toBe('db-model')
    expect(c.apiKey).toBe('db-key-abcd')
    expect(c.pdfMode).toBe('document')
    expect(c.enabled).toBe(false)
    expect(c.sources).toEqual({ baseURL: 'env', model: 'db', apiKey: 'db', pdfMode: 'env', enabled: 'db' })
  })

  it('mode Anthropic langsung: key dari ANTHROPIC_API_KEY, model default', () => {
    const c = mergeAiConfig(null, { ...noEnv, anthropicKey: 'sk-ant-x', routerKey: 'ignored' })
    expect(c.custom).toBe(false)
    expect(c.apiKey).toBe('sk-ant-x')
    expect(c.model).toBe(DEFAULT_MODEL)
    expect(c.sources.model).toBe('default')
    expect(c.pdfMode).toBe('text')
    expect(c.sources.pdfMode).toBe('default')
  })

  it('base URL dari DB mengaktifkan mode custom & memakai key router dari env', () => {
    const c = mergeAiConfig({ baseURL: 'http://db-router/v1' }, { ...noEnv, routerKey: 'rk', anthropicKey: 'ak' })
    expect(c).toMatchObject({ custom: true, baseURL: 'http://db-router', apiKey: 'rk', model: '' })
    expect(c.sources.baseURL).toBe('db')
  })

  it('pdfMode tidak valid di DB diabaikan', () => {
    expect(mergeAiConfig({ pdfMode: 'xx' as never }, routerEnv).pdfMode).toBe('document')
  })
})

describe('configReady', () => {
  it('custom butuh model; anthropic butuh key; saklar off = tidak aktif', () => {
    expect(configReady(mergeAiConfig(null, routerEnv))).toBe(true)
    expect(configReady(mergeAiConfig(null, { ...routerEnv, model: '' }))).toBe(false)
    expect(configReady(mergeAiConfig(null, noEnv))).toBe(false)
    expect(configReady(mergeAiConfig(null, { ...noEnv, anthropicKey: 'k' }))).toBe(true)
    expect(configReady(mergeAiConfig({ enabled: false }, routerEnv))).toBe(false)
  })
})

describe('maskKey', () => {
  it('hanya 4 karakter terakhir terlihat; key pendek disamarkan penuh', () => {
    expect(maskKey('sk-ant-1234567890abcd')).toBe('••••abcd')
    expect(maskKey('short')).toBe('••••')
    expect(maskKey('')).toBe('')
    expect(maskKey(null)).toBe('')
  })
})

describe('validateAiSettings', () => {
  it('menerima input valid & menormalkan URL', () => {
    const r = validateAiSettings({ baseURL: 'https://router.local/v1/', model: ' m ', apiKey: 'new', pdfMode: 'document', enabled: true }, null)
    expect(r).toEqual({ ok: true, value: { baseURL: 'https://router.local', model: 'm', apiKey: 'new', pdfMode: 'document', enabled: true } })
  })

  it('menolak URL tidak valid / bukan http(s)', () => {
    expect(validateAiSettings({ baseURL: 'bukan url' }, null).ok).toBe(false)
    expect(validateAiSettings({ baseURL: 'ftp://x' }, null).ok).toBe(false)
    expect(validateAiSettings({ baseURL: 'javascript:alert(1)' }, null).ok).toBe(false)
  })

  it('menolak pdfMode & enabled tidak valid', () => {
    expect(validateAiSettings({ pdfMode: 'pdf' }, null).ok).toBe(false)
    expect(validateAiSettings({ enabled: 'ya' }, null).ok).toBe(false)
    expect(validateAiSettings({ model: 123 }, null).ok).toBe(false)
  })

  it('apiKey kosong = pertahankan key lama; clearKey = hapus', () => {
    const cur = { apiKey: 'old-key', enabled: false }
    const keep = validateAiSettings({ apiKey: '' }, cur)
    expect(keep.ok && keep.value.apiKey).toBe('old-key')
    expect(keep.ok && keep.value.enabled).toBe(false)
    const cleared = validateAiSettings({ apiKey: '', clearKey: true }, cur)
    expect(cleared.ok && 'apiKey' in cleared.value).toBe(false)
    const replaced = validateAiSettings({ apiKey: 'baru' }, cur)
    expect(replaced.ok && replaced.value.apiKey).toBe('baru')
  })
})

describe('publicAiSettings', () => {
  it('tidak pernah membocorkan API key', () => {
    const out = publicAiSettings({ apiKey: 'db-secret-key-wxyz' }, routerEnv)
    const json = JSON.stringify(out)
    expect(json).not.toContain('db-secret-key-wxyz')
    expect(json).not.toContain('env-router-key-1234')
    expect(json).not.toContain('sk-ant-env-9999')
    expect(out.effective.keyMasked).toBe('••••wxyz')
    expect(out.saved.hasKey).toBe(true)
    expect(out.sources.apiKey).toBe('db')
  })
})
