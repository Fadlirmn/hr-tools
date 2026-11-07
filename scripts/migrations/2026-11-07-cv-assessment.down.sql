-- Rollback migrasi Penilaian CV (keputusan + riwayat), 2026-11-07.
-- Jalankan manual: psql "$DATABASE_URL" -f scripts/migrations/2026-11-07-cv-assessment.down.sql
-- Catatan: penilaian terkini di candidates.cv TIDAK dihapus (kolom lama, tetap terbaca).
-- Kandidat bertahap "Ditahan" dikembalikan ke "Screening CV" karena tahap itu tidak dikenal versi lama.
BEGIN;
UPDATE candidates SET stage = 'screening' WHERE stage = 'hold';
DROP TABLE IF EXISTS cv_assessment_history;
-- Pengaturan AI dari menu Admin (setelah drop, konfigurasi AI kembali ke .env).
DROP TABLE IF EXISTS app_settings;
COMMIT;
