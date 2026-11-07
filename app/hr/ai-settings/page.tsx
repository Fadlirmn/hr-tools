'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'
import { IconSave, IconRefresh, IconShield, IconCheckCircle, IconAlert, IconTrash } from '@/components/icons'

type Source = 'db' | 'env' | 'default'
type Field = 'baseURL' | 'model' | 'apiKey' | 'pdfMode' | 'enabled'

interface SettingsResponse {
  effective: {
    mode: 'custom' | 'anthropic'
    baseURL: string; model: string; pdfMode: 'text' | 'document'; enabled: boolean
    ready: boolean; hasKey: boolean; keyMasked: string
  }
  sources: Record<Field, Source>
  saved: { baseURL: string; model: string; pdfMode: '' | 'text' | 'document'; enabled: boolean; hasKey: boolean; keyMasked: string }
  env: { baseURL: string; model: string; pdfMode: string; hasKey: boolean }
}

interface TestResult { ok: boolean; model: string; latencyMs: number; error: string | null; reply?: string }

const SOURCE_LABEL: Record<Source, { text: string; cls: string; title: string }> = {
  db:      { text: 'Database', cls: 'violet',  title: 'Diambil dari pengaturan di halaman ini' },
  env:     { text: '.env',     cls: 'neutral', title: 'Diambil dari file .env server' },
  default: { text: 'Default',  cls: 'neutral', title: 'Belum diatur — memakai nilai bawaan' },
}

function SourceChip({ s }: { s: Source }) {
  const l = SOURCE_LABEL[s]
  return <span className={`chip ${l.cls}`} title={l.title} style={{ fontSize: 11, padding: '2px 8px' }}>{l.text}</span>
}

function FieldLabel({ htmlFor, children, source }: { htmlFor: string; children: React.ReactNode; source?: Source }) {
  return (
    <label className="fld" htmlFor={htmlFor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{children}</span>
      {source && <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center', fontWeight: 500 }}>
        <span className="hint">Sumber aktif:</span><SourceChip s={source} />
      </span>}
    </label>
  )
}

export default function AiSettingsPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [data, setData] = useState<SettingsResponse | null>(null)
  const [loadError, setLoadError] = useState('')

  const [baseURL, setBaseURL] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [clearKey, setClearKey] = useState(false)
  const [pdfMode, setPdfMode] = useState<'' | 'text' | 'document'>('')
  const [enabled, setEnabled] = useState(true)

  // Model hanya bisa dipilih dari daftar yang diambil dari endpoint
  const [models, setModels] = useState<{ id: string; name: string }[] | null>(null)
  const [fetching, setFetching] = useState(false)
  const [modelsErr, setModelsErr] = useState('')

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const apply = (d: SettingsResponse) => {
    setData(d)
    setBaseURL(d.saved.baseURL)
    setModel(d.saved.model)
    setPdfMode(d.saved.pdfMode)
    setEnabled(d.saved.enabled)
    setApiKey('')
    setClearKey(false)
  }

  const load = useCallback(async () => {
    setLoadError('')
    const res = await fetch('/api/ai-settings', { credentials: 'include' })
    const d = await res.json().catch(() => null)
    if (!res.ok || !d) { setLoadError(d?.error || 'Gagal memuat pengaturan AI.'); return }
    apply(d as SettingsResponse)
  }, [])

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      const ok = user?.role === 'hr' || user?.role === 'dev'
      setAllowed(ok)
      if (!ok) { router.replace('/hr/dashboard'); return }
      await load()
    })()
  }, [router, load])

  const save = async () => {
    setSaving(true)
    setStatus(null)
    const res = await fetch('/api/ai-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ baseURL, model, apiKey, clearKey, pdfMode, enabled }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setStatus({ kind: 'error', text: d.error || 'Gagal menyimpan.' }); return }
    apply(d as SettingsResponse)
    setStatus({ kind: 'ok', text: 'Pengaturan tersimpan. Berlaku untuk screening CV & asisten berikutnya.' })
  }

  const fetchModels = async () => {
    setFetching(true)
    setModelsErr('')
    const res = await fetch('/api/ai-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'models', baseURL, apiKey }),
    })
    const d = await res.json().catch(() => null) as { ok: boolean; models: { id: string; name: string }[]; error: string | null } | null
    setFetching(false)
    if (!d || !d.ok) { setModels(null); setModelsErr(d?.error || 'Gagal mengambil daftar model.'); return }
    setModels(d.models)
    // Model lama tidak ada di daftar → minta pilih ulang
    if (model && !d.models.some(m => m.id === model)) setModelsErr(`Model tersimpan "${model}" tidak ada di daftar endpoint ini — pilih model lain.`)
  }

  const test = async () => {
    setTesting(true)
    setStatus(null)
    const res = await fetch('/api/ai-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'test' }),
    })
    const d = (await res.json().catch(() => null)) as TestResult | null
    setTesting(false)
    if (!d) { setStatus({ kind: 'error', text: 'Tes gagal: respons server tidak valid.' }); return }
    if (!res.ok && !('ok' in d)) { setStatus({ kind: 'error', text: (d as { error?: string }).error || 'Tes gagal.' }); return }
    setStatus(d.ok
      ? { kind: 'ok', text: `Terhubung — model ${d.model} membalas dalam ${(d.latencyMs / 1000).toFixed(1)} detik.` }
      : { kind: 'error', text: `Tes gagal: ${d.error || 'tidak diketahui'}` })
  }

  if (allowed === false) return null // redirecting

  const eff = data?.effective
  const src = data?.sources
  const dirty = !!data && (
    baseURL !== data.saved.baseURL || model !== data.saved.model || pdfMode !== data.saved.pdfMode ||
    enabled !== data.saved.enabled || apiKey !== '' || clearKey
  )
  const keyPlaceholder = clearKey ? 'Dihapus saat disimpan'
    : data?.saved.hasKey ? `Tersimpan ${data.saved.keyMasked}`
    : data?.env.hasKey ? 'Pakai key .env'
    : ''

  return (
    <>
      <div className="notice" style={{ display: 'flex', gap: 9 }}>
        <IconShield size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Menimpa <code>.env</code>. Field kosong = pakai <code>.env</code>. API key disimpan tersamar.
        </div>
      </div>

      {loadError && <div className="notice" role="alert" style={{ display: 'flex', gap: 9 }}><IconAlert size={16} />{loadError}</div>}

      {eff && (
        <div className="card card-p" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>Status AI:</span>
          {eff.ready
            ? <span className="chip ok"><IconCheckCircle size={13} />Aktif</span>
            : <span className="chip no"><IconAlert size={13} />{eff.enabled ? 'Belum lengkap' : 'Dinonaktifkan'}</span>}
          <span className="hint">Mode: <b>{eff.mode === 'custom' ? 'Endpoint custom (9router)' : 'Anthropic API langsung'}</b></span>
          <span className="hint">Model: <b>{eff.model || '—'}</b></span>
          <span className="hint">API key: <b>{eff.hasKey ? eff.keyMasked : 'tidak ada'}</b></span>
        </div>
      )}

      <div className="card card-p">
        <form onSubmit={e => { e.preventDefault(); void save() }}>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input id="ai-enabled" type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--violet)', cursor: 'pointer' }} />
            <label htmlFor="ai-enabled" style={{ fontWeight: 700, cursor: 'pointer' }}>Aktifkan fitur AI</label>
            {src && <span style={{ marginLeft: 'auto' }}><SourceChip s={src.enabled} /></span>}
          </div>

          <div className="field">
            <FieldLabel htmlFor="ai-base" source={src?.baseURL}>Endpoint 9router / Base URL</FieldLabel>
            <input id="ai-base" type="text" inputMode="url" autoComplete="off" spellCheck={false}
              value={baseURL} onChange={e => { setBaseURL(e.target.value); setModels(null) }}
              placeholder={data?.env.baseURL ? `.env: ${data.env.baseURL}` : 'Kosong = Anthropic API langsung'} />
          </div>

          <div className="grid2">
            <div className="field">
              <FieldLabel htmlFor="ai-model" source={src?.model}>Model</FieldLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <select id="ai-model" value={model} onChange={e => setModel(e.target.value)} disabled={!models}
                  style={{ flex: 1, minWidth: 0 }} aria-describedby="ai-model-hint">
                  <option value="">{data?.env.model ? `Ikut .env (${data.env.model})` : models ? 'Pilih model…' : 'Ambil daftar model dulu'}</option>
                  {model && !models?.some(m => m.id === model) && <option value={model}>{model} (tersimpan)</option>}
                  {models?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button type="button" className="btn sm" onClick={fetchModels} disabled={fetching || !data} style={{ flexShrink: 0 }}>
                  <IconRefresh size={14} />{fetching ? 'Mengambil…' : models ? 'Muat ulang' : 'Ambil daftar model'}
                </button>
              </div>
              <div id="ai-model-hint" className="hint" style={{ marginTop: 4, color: modelsErr ? 'var(--no)' : undefined }} role={modelsErr ? 'alert' : undefined}>
                {modelsErr || (models ? `${models.length} model tersedia.` : 'Ambil daftar dari endpoint dulu.')}
              </div>
            </div>
            <div className="field">
              <FieldLabel htmlFor="ai-pdf" source={src?.pdfMode}>Mode PDF</FieldLabel>
              <select id="ai-pdf" value={pdfMode} onChange={e => setPdfMode(e.target.value as '' | 'text' | 'document')}>
                <option value="">Ikut .env{data?.env.pdfMode ? ` (${data.env.pdfMode})` : ' (text)'}</option>
                <option value="text">Teks</option>
                <option value="document">File PDF asli</option>
              </select>
            </div>
          </div>

          <div className="field">
            <FieldLabel htmlFor="ai-key" source={clearKey ? undefined : src?.apiKey}>API Key</FieldLabel>
            <input id="ai-key" type="password" autoComplete="new-password" spellCheck={false}
              value={apiKey} onChange={e => { setApiKey(e.target.value); if (e.target.value) setClearKey(false); setModels(null) }}
              placeholder={keyPlaceholder} disabled={clearKey} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              {data?.saved.hasKey && (
                <button type="button" className={`btn sm ${clearKey ? '' : 'danger'}`} onClick={() => { setClearKey(v => !v); setApiKey('') }}>
                  {clearKey ? 'Batal hapus key' : <><IconTrash size={14} />Hapus key tersimpan</>}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <button type="submit" className="btn primary" disabled={saving || !data}>
              <IconSave size={15} />{saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button type="button" className="btn" onClick={test} disabled={testing || !data}
              title={dirty ? 'Tes memakai pengaturan yang sudah tersimpan — simpan dulu perubahan Anda' : 'Kirim permintaan kecil ke AI'}>
              <IconRefresh size={15} />{testing ? 'Menguji…' : 'Tes koneksi'}
            </button>
            {dirty && <span className="hint">Belum disimpan.</span>}
          </div>
          <div role="status" aria-live="polite" style={{ marginTop: 12, minHeight: 20, fontSize: 13, fontWeight: 600,
            display: 'flex', gap: 6, alignItems: 'center',
            color: status?.kind === 'error' ? 'var(--no)' : 'var(--ok)' }}>
            {status && (status.kind === 'ok' ? <IconCheckCircle size={15} /> : <IconAlert size={15} />)}
            {status?.text}
          </div>
        </form>
      </div>
    </>
  )
}
