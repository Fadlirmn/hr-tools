# HR Recruitment Toolkit

Aplikasi rekrutmen terpadu dengan dua dashboard — **HR** dan **Kandidat** — berbasis Next.js + Supabase. Siap deploy ke Vercel.

## Fitur

### Dashboard HR
- Ringkasan pipeline rekrutmen (total, aktif, diterima, ditolak)
- Funnel pipeline per tahap
- Manajemen kandidat (tambah, edit, hapus, ubah tahap)
- Penilaian CV (10 kriteria, bobot per posisi, skor tertimbang)
- Psikotes (kognitif, kepribadian, situasional) + mode ujian kandidat
- Penilaian interview (6 kompetensi)
- Checklist onboarding
- Atur posisi & bobot kriteria
- Ekspor/impor data JSON

### Dashboard Kandidat
- Timeline progress lamaran
- Lihat hasil penilaian CV (read-only)
- Lihat hasil psikotes (read-only)
- Lihat hasil interview (read-only)
- Lihat progress onboarding

### Sistem Undangan
- HR generate link undangan per kandidat
- Kandidat buka link → buat password → akun otomatis terbuat
- Login dengan email + password

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Bahasa:** TypeScript
- **CSS:** Custom (Plus Jakarta Sans, port dari desain existing)
- **Database:** Supabase PostgreSQL (free tier — 500 MB)
- **Auth:** Supabase Auth (email/password + row-level security)
- **Deploy:** Vercel

## Struktur Folder

```
├── app/
│   ├── login/              # Halaman login
│   ├── invite/[token]/     # Terima undangan kandidat
│   ├── hr/                 # Dashboard HR
│   │   ├── dashboard/      # Ringkasan pipeline
│   │   ├── candidates/     # Daftar kandidat + modal
│   │   ├── cv/             # Penilaian CV
│   │   ├── psikotes/       # Psikotes + exam mode
│   │   ├── interview/      # Penilaian interview
│   │   ├── onboarding/     # Checklist onboarding
│   │   └── settings/       # Posisi, bobot, backup
│   └── candidate/          # Dashboard kandidat
│       ├── dashboard/      # Timeline progress
│       ├── hasil-cv/       # Hasil CV (read-only)
│       ├── hasil-psikotes/ # Hasil psikotes
│       ├── hasil-interview/ # Hasil interview
│       └── onboarding/     # Progress onboarding
├── lib/
│   ├── types.ts            # Interface TypeScript
│   ├── constants.ts        # Data statis (soal, kriteria, dll)
│   ├── supabase.ts         # Client browser
│   ├── supabase-server.ts  # Client server
│   └── db.ts               # Helper functions
├── middleware.ts            # Proteksi rute berdasarkan role
├── schema.sql              # Skema database Supabase
└── vercel.json             # Konfigurasi deploy
```

## Setup Lokal

### 1. Buat Project Supabase

1. Daftar/login di https://supabase.com
2. Buat project baru (nama bebas, password simpan)
3. Buka **SQL Editor** → paste isi `schema.sql` → **Run**
4. Buka **Settings → API** → salin `Project URL` dan `anon public key`

### 2. Setup Environment

```bash
cd hr-recruitment-toolkit
cp .env.example .env.local
```

Isi `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

### 3. Install & Jalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`

### 4. Buat Akun HR Pertama

Di Supabase dashboard:
1. Buka **Authentication → Users → Add User**
2. Masukkan email + password
3. Buka **SQL Editor** dan jalankan:
   ```sql
   UPDATE auth.users SET raw_user_meta_data = '{"role":"hr"}' WHERE email = 'email-yang-dibuat@contoh.com';
   ```
   Atau via API, pastikan `user_metadata` berisi `{ "role": "hr" }`.

### 5. Tambah Kandidat & Kirim Undangan

1. Login sebagai HR
2. Klik **＋ Kandidat Baru** → isi data → simpan
3. Di tabel, klik **Kirim** di kolom Undangan
4. Link tersalin ke clipboard — kirim ke kandidat
5. Kandidat buka link → buat password → login lihat dashboard sendiri

## Deploy ke Vercel

### Via GitHub (rekomendasi)

```bash
# Inisialisasi git
git init
git add .
git commit -m "init: hr recruitment toolkit"

# Buat repo di GitHub, lalu:
git remote add origin https://github.com/user/hr-recruitment-toolkit.git
git push -u origin main
```

1. Buka https://vercel.com → **Add New Project**
2. Import repo GitHub
3. Tambahkan environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Via Vercel CLI

```bash
npx vercel --prod
```

## Database (Supabase)

| Tabel | Fungsi |
|---|---|
| `positions` | Daftar posisi dengan bobot kriteria |
| `candidates` | Data kandidat + hasil asesmen (JSON) |
| `auth.users` | Manajemen user (dikelola Supabase Auth) |

### Row-Level Security

- **HR**: akses penuh ke semua tabel
- **Kandidat**: hanya bisa membaca data sendiri (`user_id = auth.uid()`)

## Yang Tidak Ada di Aplikasi Ini

- Role management UI (akun HR pertama harus dibuat manual via Supabase dashboard)
- Fitur "lupa password" (bisa ditambahkan via Supabase Auth)
- Email otomatis (undangan dikirim manual — link di-copy)

## Lisensi

Hak cipta milik pengguna. Bebas digunakan dan dimodifikasi.
