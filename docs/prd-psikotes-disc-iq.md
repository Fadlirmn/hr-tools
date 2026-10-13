# PRD: Restrukturisasi Psikotes — Tes DISC & Tes IQ

**Label:** `ready-for-agent`
**Status:** Draft siap implementasi
**Target repo:** `Fadlirmn/hr-tools` (GitHub)

---

## 1. Executive Summary

### Problem Statement

Modul psikotes saat ini (Kognitif 15 soal, Profil Kepribadian Likert, Situasional/Integritas) tidak memberi profil kepribadian standar industri (DISC) maupun pengukuran IQ yang representatif dan dapat dibandingkan lintas kandidat.

### Proposed Solution

Ganti tiga section psikotes lama dengan dua modul baru yang dibangun langsung di kode (tanpa link eksternal): **Tes DISC** (forced-choice, profil 4-dimensi + tipe dominan) dan **Tes IQ** (bank soal baru, skor + kategori), masing-masing sebagai sesi independen dengan jendela akses dan timer sendiri, auto-grade di server, dan notifikasi email ke HR saat submit.

### Success Criteria

- 100% submission DISC menghasilkan profil 4-dimensi (`D`, `I`, `S`, `C`) + tipe dominan yang terhitung benar dari formula `most_count - least_count`.
- 100% submission IQ menghasilkan `percent` dan `category` (`Tinggi` / `Rata-rata` / `Perlu Perhatian`) yang terhitung benar dari 60 soal.
- 0% kebocoran kunci jawaban (field `a` untuk IQ) ke response API saat role = `candidate`.
- HR menerima email notifikasi dalam response cycle yang sama saat kandidat submit DISC atau IQ (fire-and-forget, tidak memblokir response ke kandidat).
- HR dapat mengatur jendela akses (`open_at`/`close_at`/`time_limit`) untuk DISC dan IQ secara independen — mengubah satu tidak memengaruhi status tes lainnya.

---

## 2. User Experience & Functionality

### User Personas

- **HR Admin** — mengatur akses tes, menjalankan mode input manual, meninjau hasil kandidat.
- **Kandidat** — mengerjakan tes secara mandiri dari dashboard dalam jendela waktu yang ditentukan HR.
- **Developer** — mengimplementasikan dan memelihara modul ini sesuai kontrak data/API di bawah.

### User Stories & Acceptance Criteria

**Epic A — Manajemen akses tes (HR)**

- Sebagai HR admin, saya ingin membuka akses Tes DISC dan Tes IQ secara terpisah agar bisa menjadwalkan keduanya di waktu berbeda.
- Sebagai HR admin, saya ingin mengatur bulk-access per jenis tes agar efisien menangani banyak kandidat.
- Sebagai HR admin, saya ingin halaman "Akses Psikotes" menampilkan status DISC dan IQ sebagai dua kolom independen per kandidat.

**AC:**
- [ ] `disc_open_at`/`disc_close_at`/`disc_time_limit` dan `iq_open_at`/`iq_close_at`/`iq_time_limit` dapat diatur independen per kandidat dan secara bulk.
- [ ] Mengubah jendela akses DISC tidak mengubah nilai jendela akses IQ pada record yang sama, dan sebaliknya.
- [ ] Tabel akses menampilkan 2 kolom status (`belum`/`aktif`/`kadaluarsa`/`selesai`) terpisah untuk DISC dan IQ.

**Epic B — Pengerjaan tes (Kandidat)**

- Sebagai kandidat, saya ingin mengerjakan Tes DISC dan Tes IQ secara mandiri dari dashboard dengan timer countdown masing-masing.
- Sebagai kandidat, saya ingin tes otomatis submit saat waktu habis.
- Sebagai kandidat, saya ingin pesan status yang jelas ("belum dibuka"/"akses kedaluwarsa") untuk setiap jenis tes.

**AC:**
- [ ] Modal pengerjaan tes menerima parameter `type: 'disc' | 'iq'` dan menjalankan timer independen sesuai `*_time_limit` masing-masing.
- [ ] Saat `timeLeft === 0`, submit otomatis terpicu tanpa interaksi kandidat.
- [ ] Gating ditampilkan per jenis tes: jika `*_open_at`/`*_close_at`/`*_time_limit` null → "belum dibuka"; jika `*_close_at < now` → "akses kedaluwarsa"; jika hasil sudah ada → "selesai".
- [ ] Kandidat yang menyelesaikan satu tes lebih dulu tidak diblokir dari mengerjakan tes lainnya.

**Epic C — Mode HR manual & review hasil**

- Sebagai HR admin, saya ingin menjalankan Tes DISC/IQ dalam mode input manual untuk kandidat yang tes offline.
- Sebagai HR admin, saya ingin membuka "Mode Pengerjaan Kandidat" layar penuh untuk kedua jenis tes.
- Sebagai HR admin, saya ingin melihat tipe DISC dominan dan skor+kategori IQ di profil kandidat.
- Sebagai kandidat, saya ingin melihat hasil tes saya (read-only) di halaman hasil psikotes.

**AC:**
- [ ] Panel HR untuk DISC dan IQ terpisah secara visual, masing-masing punya tombol "Mulai Tes Kandidat" (full-screen) dan form input manual.
- [ ] Profil kandidat menampilkan `dominant` (DISC) dan `percent`+`category` (IQ) dari `psikotes_result`.
- [ ] Halaman hasil kandidat (`/candidate/hasil-psikotes`) read-only, tidak memiliki kontrol untuk mengubah hasil.

**Epic D — Integritas data & notifikasi (Developer)**

- Sebagai developer, saya ingin skor DISC dan IQ dihitung di server agar kunci jawaban tidak pernah dikirim ke browser kandidat.
- Sebagai developer, saya ingin bank soal lama (cog/trait/sjt) dihapus bersih tanpa dead code.
- Sebagai developer, saya ingin email ke HR terpicu otomatis saat submit tanpa duplikasi logic SMTP.

**AC:**
- [ ] Endpoint `/api/exam-questions` menyembunyikan field `a` dari soal IQ saat `role = candidate`; field most/least DISC tetap dikirim utuh (bukan jawaban benar/salah).
- [ ] `PSI_COG`, `PSI_TRAIT`, `PSI_SJT`, dan semua pemanggilnya dihapus dari codebase, bukan dikomentari/dormant.
- [ ] Fungsi kirim email diekstrak ke `lib/email.ts` dan dipakai bersama oleh `notify-psikotes` dan `exam-submit`.

### Non-Goals

- Tidak membangun ulang sistem auth/role.
- Tidak mengubah mekanisme invite kandidat.
- Tidak membuat UI admin baru untuk mengedit bank soal di luar pola CRUD `exam_questions` yang sudah ada.
- Tidak menyediakan laporan agregat/analytics lintas kandidat untuk hasil DISC/IQ — hanya tampilan per-kandidat.
- Tidak memigrasikan data psikotes lama (kandidat dengan hasil cog/trait/sjt) ke format baru — kolom `psikotes` lama dipertahankan apa adanya sebagai arsip read-only.

---

## 3. AI System Requirements

Bagian ini **hanya berlaku untuk proses pembuatan bank soal awal** (one-off, bukan fitur runtime aplikasi). Scoring DISC/IQ saat runtime adalah deterministic code biasa — **tidak memanggil LLM**, karena precise computation + deterministic output tidak cocok untuk LLM.

### Tool Requirements

- Akses ke LLM (model apa pun yang tersedia untuk tim) untuk generate draft 24 blok DISC dan 60 soal IQ dalam format JSON terstruktur.
- Tidak ada integrasi API LLM di dalam aplikasi produksi — skrip generator dijalankan manual, sekali, di luar runtime.

### Evaluation Strategy

1. **Manual validation**: generate 1 blok DISC dan 1 soal per kategori IQ terlebih dahulu, cek format dan kualitas sebelum lanjut ke batch penuh.
2. **Review manual oleh HR**: setiap item hasil generate ditinjau untuk bahasa, bias budaya/gender (khususnya kata sifat DISC), dan validitas kunci jawaban (IQ) sebelum disimpan sebagai `reviewed.json`.
3. **Kriteria lolos review**: kata DISC tidak bias gender/budaya tertentu; soal IQ punya tepat 1 jawaban benar yang tidak ambigu; format JSON valid sesuai shape `DiscBlock`/`IqQuestion` tanpa perlu perbaikan manual pada struktur (hanya konten boleh diedit).
4. Item yang gagal kriteria pada langkah 3 ditulis ulang manual oleh HR, bukan di-generate ulang otomatis.

---

## 4. Technical Specifications

### Architecture Overview

```
Kandidat submit jawaban
  → POST /api/exam-submit { type: 'disc'|'iq', ...jawaban }
    → Validasi sesi & role (401/403 jika gagal)
    → Hitung skor deterministic (formula di bawah)
    → Simpan ke candidates.psikotes_result.{disc|iq}
    → Panggil lib/email.ts → kirim notifikasi ke HR (fire-and-forget)
    → Response { ok: true, result }
```

Komponen yang terlibat: `ExamModal` (UI per-tipe tes), `/api/exam-questions` (distribusi soal, kunci disembunyikan sesuai role), `/api/exam-submit` (scoring + simpan + notifikasi), `lib/email.ts` (helper SMTP bersama), `schema.sql` (struktur tabel & seed data).

### Data Model

**Kolom baru pada tabel `candidates`** (ditambah via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, kolom lama **tidak dihapus**):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `psikotes_result` | JSONB | `{ disc: DiscResult \| null, iq: IqResult \| null }` |
| `disc_open_at`, `disc_close_at` | TIMESTAMPTZ | Jendela akses Tes DISC |
| `disc_time_limit` | INTEGER | Menit |
| `iq_open_at`, `iq_close_at` | TIMESTAMPTZ | Jendela akses Tes IQ |
| `iq_time_limit` | INTEGER | Menit |

```ts
type DiscResult = {
  most: Record<number, 'D'|'I'|'S'|'C'>
  least: Record<number, 'D'|'I'|'S'|'C'>
  graph: { D: number, I: number, S: number, C: number }
  dominant: string   // "D" atau "DI" jika seri
  date: string
  via: 'kandidat' | 'hr'
}

type IqResult = {
  answers: Record<number, number>
  correct: number
  total: number        // 60
  percent: number
  category: 'Tinggi' | 'Rata-rata' | 'Perlu Perhatian'
  date: string
  via: 'kandidat' | 'hr'
}
```

**Bank soal** (`exam_questions` table, tipe baru `disc` dan `iq`, menggantikan `psi_cog`/`psi_trait`/`psi_sjt`):

- DISC: 24 blok, tiap blok 4 kata (1 per dimensi D/I/S/C).
- IQ: 60 soal, 15 per kategori (Logika, Numerik, Verbal, Spasial), shape identik `{ sec, q, o, a }`.

### Scoring Formulas

- **DISC**: untuk setiap dimensi, `graph[dim] = most_count[dim] - least_count[dim]`. `dominant` = dimensi dengan `graph` tertinggi; jika dua dimensi seri di posisi teratas, gabungkan jadi 2 huruf diurutkan D→I→S→C (contoh: `"DI"`).
- **IQ**: `percent = correct / 60 * 100`. Kategori: `percent >= 80` → `Tinggi`; `50 <= percent < 80` → `Rata-rata`; `percent < 50` → `Perlu Perhatian`.

### Integration Points

- **API**: `/api/exam-questions` (GET, perluas dengan tipe `disc`/`iq`), `/api/exam-submit` (POST, terima `type` di body), `/api/candidates` (PATCH, tidak berubah kontraknya).
- **Database**: Supabase PostgreSQL, perubahan skema murni additive (kolom baru, tidak ada `DROP COLUMN`).
- **Auth**: role dari `user_metadata.role` (`hr`/`candidate`/`dev`) via Supabase session, pola existing dipertahankan — tidak ada perubahan di `middleware.ts`.
- **Email**: SMTP via `nodemailer`, kredensial dari env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) — sama dengan yang sudah dipakai `notify-psikotes`.

### Security & Privacy

- Kunci jawaban IQ (field `a`) tidak pernah dikirim ke client saat `role = candidate` — difilter di `/api/exam-questions` sebelum response, konsisten dengan pola existing untuk `cog`.
- Scoring DISC & IQ dihitung 100% di server (`/api/exam-submit`); client hanya mengirim jawaban mentah.
- Semua tulis ke tabel `candidates` tetap lewat server API (bukan client Supabase langsung) untuk bypass RLS/JWT issue yang sudah terdokumentasi di histori commit repo ini.
- Kegagalan pengiriman email tidak boleh menggagalkan penyimpanan hasil tes — notifikasi bersifat best-effort (try/catch), konsisten dengan pola `notify-psikotes` existing.

---

## 5. Risks & Roadmap

### Phased Rollout

- **MVP**: bank soal DISC (24 blok) & IQ (60 soal) ter-generate dan ter-review; scoring formula berfungsi; halaman HR & kandidat menampilkan DISC+IQ sebagai dua tes independen dengan gating akses dasar.
- **v1.1**: notifikasi email ke HR saat submit; bulk-access management per jenis tes; UI status 2-kolom di halaman Akses Psikotes.
- **v2.0** *(di luar scope PRD ini)*: opsi migrasi/arsip data psikotes lama ke format terstruktur; UI admin untuk edit bank soal tanpa lewat SQL langsung.

### Technical Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Soal DISC/IQ hasil generate LLM mengandung bias atau ambigu | Hasil tes tidak valid untuk kandidat | Gate review manual HR wajib sebelum soal di-seed ke `schema.sql` (lihat §3) |
| Kegagalan kirim email (SMTP down/misconfig) | HR tidak tahu ada submission baru | Non-blocking try/catch; hasil tetap tersimpan di DB terlepas status email |
| Dua jendela akses independen (DISC & IQ) membingungkan HR saat transisi dari sistem 1-tes lama | Kesalahan operasional saat rollout | Dokumentasikan perbedaan jelas di UI halaman Akses Psikotes (2 kolom terpisah, bukan 1 status gabungan) |
| Kolom lama (`psikotes`, `psikotes_open_at`, dst.) tidak dihapus — potensi kebingungan developer baru | Technical debt jangka panjang | Catat di komentar `schema.sql` bahwa kolom tersebut arsip read-only, bukan aktif dipakai |

### TBD (Belum Final)

- Isi final kata sifat DISC dan soal IQ — baru sebatas kuantitas (24 blok / 60 soal) dan kategori, kontennya ditulis saat eksekusi §3.
- `gh` CLI tidak tersedia di environment pengembangan ini — publish PRD ke GitHub Issues harus dilakukan manual oleh pemilik repo dengan label `ready-for-agent`.
