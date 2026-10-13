# Checklist Migrasi: Tes DISC & Tes IQ

Jalankan berurutan. Setiap langkah punya cara verifikasi sendiri.

## 1. Isi `.env.local`

File `.env.local` sudah dibuat (copy dari `.env.example`), tapi `SUPABASE_SERVICE_ROLE_KEY` masih placeholder. Isi dengan key asli:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project → **Settings** → **API**.
2. Copy **service_role key** (bukan anon/publishable key — ini secret, jangan di-commit atau dibagikan).
3. Edit `.env.local`, ganti baris:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ... # dari Supabase Dashboard > Settings > API > service_role key
   ```
   dengan key asli (tanpa komentar di belakangnya).
4. Isi juga `HR_NOTIFY_EMAIL` dengan email HR yang mau terima notifikasi submit tes.
5. (Opsional) Isi `SMTP_*` kalau mau pakai SMTP sendiri untuk pengiriman email — kalau dikosongkan, sistem fallback ke konfigurasi SMTP Supabase project (jika ada).

**Verifikasi**: `cat .env.local` — pastikan `SUPABASE_SERVICE_ROLE_KEY` bukan lagi `eyJ...` placeholder.

## 2. Jalankan migrasi SQL di Supabase

1. Buka Supabase Dashboard → **SQL Editor**.
2. Buka file `schema.sql` di repo ini, copy **seluruh isinya**.
3. Paste ke SQL Editor → klik **Run**.

Skrip ini aman dijalankan berkali-kali (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `DROP ... IF EXISTS`) — tidak akan menghapus data kandidat yang sudah ada.

**Yang terjadi**:
- Kolom baru ditambahkan ke `candidates`: `psikotes_result`, `disc_open_at/close_at/time_limit`, `iq_open_at/close_at/time_limit`.
- Kolom lama (`psikotes`, `psikotes_open_at`, dst) **tidak dihapus** — tetap ada sebagai arsip.
- Tabel `exam_questions` constraint diubah dari `cog/trait/sjt` ke `disc/iq`.
- Baris seed lama (`psi_cog`, `psi_trait`, `psi_sjt`) dihapus.
- Baris seed baru (`disc_blocks` 24 soal, `iq_questions` 60 soal) di-insert.

## 3. Verifikasi migrasi otomatis

```bash
npm install  # kalau belum, untuk pastikan @supabase/supabase-js tersedia
node scripts/verify-migration.mjs
```

Script ini mengecek:
- Kolom baru ada di `candidates`.
- Tidak ada sisa tipe lama (`cog`/`trait`/`sjt`) di `exam_questions`.
- Seed `disc_blocks` ada dan berisi 24 soal.
- Seed `iq_questions` ada dan berisi 60 soal.

Semua baris harus `✓`. Kalau ada `✗`, jalankan ulang `schema.sql` (langkah 2) — aman di-rerun.

## 4. Test lokal dengan dev server

```bash
npm run dev
```

Buka `http://localhost:3000`, login sebagai HR (role `hr`/`dev`), lalu:
- Buka **Psikotes** → cek panel Tes DISC (24 soal Most/Least) dan Tes IQ (60 soal) muncul.
- Buka **Akses Tes** → cek tabel menampilkan kolom "Status DISC" dan "Status IQ" terpisah.
- Coba "Buka Akses" untuk satu kandidat, isi batas waktu & hari → cek tidak error.

## 5. Deploy ke Vercel (kalau pakai Vercel)

Tambahkan env var yang sama di Vercel Dashboard → Project → **Settings** → **Environment Variables**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (sama seperti `.env.local`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (sama seperti `.env.local`) |
| `SUPABASE_SERVICE_ROLE_KEY` | (sama seperti `.env.local` — secret) |
| `HR_NOTIFY_EMAIL` | email HR |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | (opsional, kalau pakai SMTP sendiri) |

Lalu redeploy (push ke `main` otomatis trigger deploy kalau sudah terhubung GitHub).

## Rollback (kalau perlu batalkan)

Fitur ini additive — untuk "nonaktifkan" tanpa hapus data:
1. Kolom lama (`psikotes`, `psikotes_open_at`, dst.) masih utuh, UI lama bisa dikembalikan dengan `git revert` ke commit sebelum `a9af5be`.
2. Kolom baru (`psikotes_result`, `disc_*`, `iq_*`) boleh dibiarkan menganggur di DB — tidak mengganggu fitur lama kalau UI lama dikembalikan.
3. Tidak perlu `DROP COLUMN` apa pun kecuali benar-benar yakin tidak akan dipakai lagi.
