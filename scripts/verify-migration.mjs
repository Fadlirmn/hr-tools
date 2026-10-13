#!/usr/bin/env node
/**
 * Verifikasi migrasi DISC/IQ sudah berhasil dijalankan di Supabase.
 * Jalankan: node scripts/verify-migration.mjs
 *
 * Butuh .env.local berisi NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (service role, bukan anon key — untuk bypass RLS saat cek skema).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnvLocal() {
  try {
    const content = readFileSync('.env.local', 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      val = val.split(' #')[0].trim() // strip inline comment
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    console.error('✗ .env.local tidak ditemukan. Copy dari .env.example dulu.')
    process.exit(1)
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || serviceKey.startsWith('eyJ...')) {
  console.error('✗ SUPABASE_SERVICE_ROLE_KEY belum diisi dengan key asli di .env.local')
  console.error('  Ambil dari: Supabase Dashboard > Settings > API > service_role key (secret)')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

let allOk = true

function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) allOk = false
}

async function main() {
  console.log('--- Verifikasi migrasi DISC/IQ ---\n')

  // 1. Cek kolom baru di candidates
  const { data: candSample, error: candErr } = await admin.from('candidates').select('*').limit(1)
  if (candErr) {
    check('Tabel candidates dapat diakses', false, candErr.message)
  } else {
    check('Tabel candidates dapat diakses', true)
    const cols = candSample.length > 0 ? Object.keys(candSample[0]) : []
    const required = ['psikotes_result', 'disc_open_at', 'disc_close_at', 'disc_time_limit', 'iq_open_at', 'iq_close_at', 'iq_time_limit']
    if (candSample.length === 0) {
      // Tabel kosong — cek via describe query alternatif
      const { error: colErr } = await admin.from('candidates').select(required.join(',')).limit(0)
      check('Kolom baru ada di tabel candidates (psikotes_result, disc_*, iq_*)', !colErr, colErr?.message)
    } else {
      const missing = required.filter(c => !cols.includes(c))
      check('Kolom baru ada di tabel candidates (psikotes_result, disc_*, iq_*)', missing.length === 0, missing.length ? `kolom hilang: ${missing.join(', ')}` : '')
    }
  }

  // 2. Cek constraint type exam_questions (harus disc/iq, bukan cog/trait/sjt)
  const { data: examRows, error: examErr } = await admin.from('exam_questions').select('id,type')
  if (examErr) {
    check('Tabel exam_questions dapat diakses', false, examErr.message)
  } else {
    check('Tabel exam_questions dapat diakses', true)
    const types = [...new Set(examRows.map(r => r.type))]
    const hasOldTypes = types.some(t => ['cog', 'trait', 'sjt'].includes(t))
    check('Tidak ada sisa tipe lama (cog/trait/sjt) di exam_questions', !hasOldTypes, hasOldTypes ? `ditemukan: ${types.join(', ')}` : '')

    const discRow = examRows.find(r => r.id === 'disc_blocks' && r.type === 'disc')
    check('Seed disc_blocks ada', !!discRow)

    const iqRow = examRows.find(r => r.id === 'iq_questions' && r.type === 'iq')
    check('Seed iq_questions ada', !!iqRow)

    if (discRow) {
      const { data: discData } = await admin.from('exam_questions').select('data').eq('id', 'disc_blocks').single()
      const count = Array.isArray(discData?.data) ? discData.data.length : 0
      check('Seed disc_blocks berisi 24 soal', count === 24, `count=${count}`)
    }
    if (iqRow) {
      const { data: iqData } = await admin.from('exam_questions').select('data').eq('id', 'iq_questions').single()
      const count = Array.isArray(iqData?.data) ? iqData.data.length : 0
      check('Seed iq_questions berisi 60 soal', count === 60, `count=${count}`)
    }
  }

  console.log('\n' + (allOk ? '✓ Semua pengecekan lolos. Migrasi berhasil.' : '✗ Ada pengecekan gagal. Jalankan ulang schema.sql di Supabase SQL Editor.'))
  process.exit(allOk ? 0 : 1)
}

main().catch(err => {
  console.error('✗ Error tak terduga:', err.message)
  process.exit(1)
})
