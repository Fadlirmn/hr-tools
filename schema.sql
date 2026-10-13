-- =============================================================
-- schema.sql — Self-hosted PostgreSQL (bukan Supabase).
-- Auth ditangani di app code (lib/auth.ts, PBKDF2 + session cookie
-- HMAC), BUKAN Supabase Auth/RLS. Semua access-control (siapa boleh
-- baca/tulis apa) dicek di Route Handler, bukan di DB policy.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table — menggantikan Supabase auth.users.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate', -- 'hr' | 'dev' | 'candidate'
  nama TEXT DEFAULT '',
  username TEXT DEFAULT '',
  telepon TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_sign_in_at TIMESTAMPTZ DEFAULT NULL
);

-- Password reset tokens — menggantikan Supabase resetPasswordForEmail.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Posisi Baru',
  weights JSONB NOT NULL DEFAULT '{}'
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  nama TEXT NOT NULL,
  posisi TEXT REFERENCES positions(id) ON DELETE SET NULL,
  sumber TEXT DEFAULT 'LinkedIn',
  email TEXT DEFAULT '',
  telepon TEXT DEFAULT '',
  catatan TEXT DEFAULT '',
  stage TEXT DEFAULT 'screening',
  tanggal TEXT DEFAULT '',
  invite_token TEXT UNIQUE DEFAULT NULL,
  cv JSONB DEFAULT NULL,
  -- Arsip hasil psikotes lama (cog/trait/sjt) — read-only, tidak dipakai di UI baru.
  psikotes JSONB DEFAULT NULL,
  psikotes_open_at TIMESTAMPTZ DEFAULT NULL,
  psikotes_close_at TIMESTAMPTZ DEFAULT NULL,
  psikotes_time_limit INTEGER DEFAULT NULL,
  interview JSONB DEFAULT NULL,
  onboarding JSONB DEFAULT NULL
);

-- Kolom baru untuk Tes DISC & Tes IQ (dua sesi independen).
-- Additive, aman di-run ulang; kolom lama di atas TIDAK dihapus.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS psikotes_result JSONB DEFAULT NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_open_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_close_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_time_limit INTEGER DEFAULT NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS iq_open_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS iq_close_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS iq_time_limit INTEGER DEFAULT NULL;

-- Insert default positions
INSERT INTO positions (id, name, weights) VALUES
  ('copywriter', 'Copywriter / Scriptwriter', '{"exp":3,"skill":3,"portfolio":3,"achiev":2,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":2}'),
  ('videoeditor', 'Video Editor', '{"exp":3,"skill":3,"portfolio":3,"achiev":1,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":1}'),
  ('creator', 'Content Creator / Talent', '{"exp":2,"skill":2,"portfolio":3,"achiev":2,"edu":1,"stability":1,"fit":3,"salary":1,"cvquality":1,"soft":3}'),
  ('sosmed', 'Social Media Admin', '{"exp":2,"skill":3,"portfolio":2,"achiev":2,"edu":1,"stability":2,"fit":2,"salary":1,"cvquality":2,"soft":2}'),
  ('designer', 'Graphic Designer', '{"exp":3,"skill":3,"portfolio":3,"achiev":1,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":1}'),
  ('admin', 'Admin Marketplace / Olshop', '{"exp":2,"skill":2,"portfolio":1,"achiev":1,"edu":1,"stability":3,"fit":2,"salary":1,"cvquality":3,"soft":2}')
ON CONFLICT (id) DO NOTHING;

-- Exam questions
CREATE TABLE IF NOT EXISTS exam_questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('disc','iq')),
  label TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '[]'
);

-- Relax CHECK constraint if table already exists from a previous schema version
ALTER TABLE exam_questions DROP CONSTRAINT IF EXISTS exam_questions_type_check;
ALTER TABLE exam_questions ADD CONSTRAINT exam_questions_type_check CHECK (type IN ('disc','iq'));
-- Hapus baris bank soal lama (cog/trait/sjt) jika tersisa dari migrasi sebelumnya
DELETE FROM exam_questions WHERE id IN ('psi_cog', 'psi_trait', 'psi_sjt');

-- Insert default questions (dijalankan sekali; data harus sinkron dengan lib/constants.ts)
-- CATATAN SUMBER (disc_questions): soal, mapping huruf->dimensi, tabel konversi skor,
-- dan nama pola perilaku diadaptasi dari testdisc.online, yang mereplikasi struktur
-- Personal Profile System / "Classical Pattern" (Carlson Learning/Inscape, kini bagian
-- dari Wiley "Everything DiSC"). Mapping dan tabel konversi tidak disimpan di DB
-- (ada sebagai konstanta tetap di lib/disc-scoring.ts & lib/constants.ts) karena terikat
-- erat ke 24 nomor soal ini — HANYA teks pilihan (bukan urutan/jumlah soal) yang aman diedit.
INSERT INTO exam_questions (id, type, label, data) VALUES
  ('disc_blocks', 'disc', 'Tes DISC', '[{"no":1,"options":{"a":"Lembut, ramah","b":"Membujuk, meyakinkan","c":"Sederhana, rendah hati","d":"Asli, pribadi, pencipta"}},{"no":2,"options":{"a":"Menarik, mempesona","b":"Mudah bekerja sama & setuju","c":"Keras kepala, tidak mudah menyerah","d":"Manis, menyenangkan"}},{"no":3,"options":{"a":"Mau dipimpin, mengikuti","b":"Tangguh, berani","c":"Loyal, setia, mengabdi","d":"Mempesona, menyenangkan"}},{"no":4,"options":{"a":"Berpandangan terbuka, mau menerima","b":"Tegar, suka menolong","c":"Tekun, berkemauan keras","d":"Periang, selalu bergembira"}},{"no":5,"options":{"a":"Periang, suka bergurau","b":"Teliti, tepat","c":"Kasar, berani, kurang sopan, tidak malu","d":"Tenang, terkendali"}},{"no":6,"options":{"a":"Kompetitif, selalu ingin berhasil","b":"Timbang rasa, peduli, bijaksana","c":"Terbuka, ramah, suka senang-senang","d":"Harmonis, mudah menyetujui"}},{"no":7,"options":{"a":"Rewel, cerewet, sulit puas","b":"Taat, patuh","c":"Tidak mudah mundur, fokus, ulet","d":"Suka melucu, lincah, periang"}},{"no":8,"options":{"a":"Berani, tidak gentar, tangguh","b":"Membangkitkan semangat, memotivasi","c":"Patuh, berhasil, menyerah","d":"Takut-takut, malu, pendiam"}},{"no":9,"options":{"a":"Suka bergaul dan bersosialisasi","b":"Sabar, penuh keyakinan, toleransi","c":"Percaya diri, mandiri","d":"Halus/lembut, pendiam, menyendiri"}},{"no":10,"options":{"a":"Menyukai hal baru, suka tantangan","b":"Terbuka, menerima ide dan saran","c":"Ramah, hangat, bersahabat","d":"Moderat, menghindari ekstrim"}},{"no":11,"options":{"a":"Banyak bicara, cerewet","b":"Terkendali, mudah diatur","c":"Melakukan hal biasa, tidak berlebihan","d":"Tegas, cepat ambil keputusan"}},{"no":12,"options":{"a":"Berbudi bahasa halus, tingkah laku yg halus","b":"Berani, suka mengambil resiko","c":"Diplomatik, bijaksana","d":"Mudah puas atau senang"}},{"no":13,"options":{"a":"Agresif, suka tantangan, penuh inisiatif","b":"Menyukai hiburan, ramah, suka kumpul","c":"Pengikut, mudah kerjasama orang lain","d":"Gelisah, khawatir"}},{"no":14,"options":{"a":"Berhati-hati","b":"Fokus hal tertentu, tidak mudah goyah","c":"Meyakinkan","d":"Baik hati, menyenangkan"}},{"no":15,"options":{"a":"Rela berkorban, mengikuti arus","b":"Antusias, selalu ingin tahu","c":"Mudah menyetujui","d":"Lincah, antusias"}},{"no":16,"options":{"a":"Percaya diri, yakin pada diri sendiri","b":"Simpatik, orang yg pengertian","c":"Toleran","d":"Tegas, agresif"}},{"no":17,"options":{"a":"Disiplin, terkendali","b":"Dermawan, suka berbagi","c":"Suka berekspresi, banyak ekspresi","d":"Gigih, tidak mudah menyerah"}},{"no":18,"options":{"a":"Terpuji, dapat dikagumi, patut dipuji","b":"Ramah, senang menolong","c":"Mudah Menyerah, menerima pendapat","d":"Memiliki karakter kuat, tangguh"}},{"no":19,"options":{"a":"Menunjukkan rasa hormat","b":"Pelopor, perintis, giat, mau berusaha","c":"Optimis, pandangan positif","d":"Selalu siap untuk membantu"}},{"no":20,"options":{"a":"Dapat berargumentasi","b":"Fleksibel, mudah beradaptasi","c":"Tak peduli, acuh tak acuh","d":"Riang, tiada yg dipikirkan sama sekali"}},{"no":21,"options":{"a":"Dapat dipercaya, percaya kepada orang lain","b":"Mudah puas, selalu merasa cukup","c":"Selalu positif, tidak diragukan","d":"Tenang, Pendiam"}},{"no":22,"options":{"a":"Mudah bergaul, suka berteman","b":"Berbudaya, banyak pengetahuan","c":"Bersemangat, giat","d":"Toleransi, tidak tegas"}},{"no":23,"options":{"a":"Menyenangkan, ramah","b":"Teliti, akurat","c":"Terus terang, bicara bebas","d":"Terkendali, emosi yang terkendali"}},{"no":24,"options":{"a":"Resah, tidak bisa santai","b":"Baik hati, ramah","c":"Populer, disukai banyak orang","d":"Rapi, teratur"}}]'),
  ('iq_questions', 'iq', 'Tes IQ', '[
    {"sec":"Logika","q":"Semua karyawan tetap datang sebelum jam 8. Budi datang jam 9. Maka...","o":["Budi karyawan rajin","Budi bukan karyawan tetap","Budi karyawan teladan","Tidak ada kesimpulan"],"a":1},
    {"sec":"Logika","q":"Semua mawar adalah bunga. Sebagian bunga berwarna merah. Maka...","o":["Semua mawar merah","Sebagian mawar pasti merah","Belum tentu semua mawar merah","Mawar bukan bunga"],"a":2},
    {"sec":"Logika","q":"Jika hari ini Selasa, 3 hari lagi jatuh pada hari...","o":["Kamis","Jumat","Sabtu","Rabu"],"a":1},
    {"sec":"Logika","q":"A lebih tinggi dari B. B lebih tinggi dari C. Maka...","o":["C lebih tinggi dari A","A lebih tinggi dari C","A sama tinggi dengan C","Tidak ada kesimpulan"],"a":1},
    {"sec":"Logika","q":"Semua kucing adalah mamalia. Tidak ada mamalia yang bertelur. Maka...","o":["Beberapa kucing bertelur","Semua kucing bertelur","Tidak ada kucing yang bertelur","Tidak ada kesimpulan"],"a":2},
    {"sec":"Logika","q":"Jika semua X adalah Y, dan beberapa Y adalah Z, maka...","o":["Semua X adalah Z","Beberapa X mungkin Z","Tidak ada X yang Z","X dan Z tidak berhubungan"],"a":1},
    {"sec":"Logika","q":"Budi selalu berbohong. Budi berkata \"saya berkata benar\". Maka pernyataan itu...","o":["Benar","Salah","Paradoks","Tidak relevan"],"a":2},
    {"sec":"Logika","q":"Jika tidak hujan maka saya jalan kaki. Saya tidak jalan kaki. Maka...","o":["Hujan","Tidak hujan","Tidak bisa disimpulkan","Saya naik motor"],"a":0},
    {"sec":"Logika","q":"Lima orang duduk melingkar. A di kanan B, B di kanan C. Posisi C terhadap A adalah...","o":["Di kanan A","Di kiri A","Berhadapan dengan A","Tidak bisa ditentukan"],"a":3},
    {"sec":"Logika","q":"Semua yang tajam dapat memotong. Pisau ini tajam. Maka...","o":["Pisau ini dapat memotong","Pisau ini tidak tajam","Pisau ini tumpul","Tidak ada kesimpulan"],"a":0},
    {"sec":"Logika","q":"Jika A maka B. Jika B maka C. A benar. Maka...","o":["C pasti benar","C pasti salah","C tidak bisa ditentukan","B pasti salah"],"a":0},
    {"sec":"Logika","q":"Tidak semua burung bisa terbang. Penguin adalah burung. Maka...","o":["Penguin pasti bisa terbang","Penguin pasti tidak bisa terbang","Belum tentu penguin bisa terbang","Penguin bukan burung"],"a":2},
    {"sec":"Logika","q":"Dari 3 kotak, hanya 1 berisi hadiah. Kotak A bertuliskan \"hadiah ada di sini\", kotak B \"hadiah tidak di A\", kotak C \"hadiah tidak di sini\". Jika hanya satu tulisan benar, di mana hadiahnya?","o":["A","B","C","Tidak bisa ditentukan"],"a":1},
    {"sec":"Logika","q":"Semua anggota tim hadir rapat kecuali yang sakit. Rina tidak hadir. Maka...","o":["Rina pasti sakit","Rina mungkin sakit","Rina pasti sehat","Rina bukan anggota tim"],"a":1},
    {"sec":"Logika","q":"Jika harga naik maka permintaan turun. Permintaan tidak turun. Maka...","o":["Harga naik","Harga tidak naik","Harga tetap","Tidak ada hubungan"],"a":1},
    {"sec":"Numerik","q":"Harga produk Rp80.000 didiskon 25%. Harga setelah diskon?","o":["Rp55.000","Rp60.000","Rp65.000","Rp20.000"],"a":1},
    {"sec":"Numerik","q":"Berapa 15% dari 200?","o":["20","25","30","35"],"a":2},
    {"sec":"Numerik","q":"3 editor menghasilkan 12 video/hari. Berapa video 5 editor/hari (kecepatan sama)?","o":["15","18","20","24"],"a":2},
    {"sec":"Numerik","q":"Rata-rata dari 10, 20, 30, 40 adalah...","o":["20","25","30","35"],"a":1},
    {"sec":"Numerik","q":"Stok 50 item naik 20%. Jumlah baru?","o":["55","58","60","70"],"a":2},
    {"sec":"Numerik","q":"Deret angka: 2, 4, 8, 16, ... Angka berikutnya?","o":["24","30","32","20"],"a":2},
    {"sec":"Numerik","q":"Deret angka: 1, 4, 9, 16, 25, ... Angka berikutnya?","o":["30","36","32","49"],"a":1},
    {"sec":"Numerik","q":"Jika 3x + 5 = 20, maka x = ?","o":["3","4","5","6"],"a":2},
    {"sec":"Numerik","q":"Sebuah mobil menempuh 180 km dalam 3 jam. Berapa km/jam rata-ratanya?","o":["50","60","70","80"],"a":1},
    {"sec":"Numerik","q":"Deret: 100, 90, 81, 73, ... Pola pengurangan berkurang 1 tiap langkah. Angka berikutnya?","o":["64","65","66","67"],"a":1},
    {"sec":"Numerik","q":"Perbandingan 2:3 jika total 50, maka nilai bagian pertama adalah...","o":["18","20","22","25"],"a":1},
    {"sec":"Numerik","q":"Jika 1 lusin = 12 buah, berapa total buah dalam 7 lusin?","o":["72","80","84","96"],"a":2},
    {"sec":"Numerik","q":"Modal Rp1.000.000 untung 12% per tahun. Setelah 1 tahun jadi berapa?","o":["Rp1.100.000","Rp1.120.000","Rp1.200.000","Rp1.012.000"],"a":1},
    {"sec":"Numerik","q":"Deret: 3, 6, 11, 18, 27, ... (selisih bertambah 2 setiap langkah). Angka berikutnya?","o":["36","38","40","35"],"a":0},
    {"sec":"Numerik","q":"Jika a = 5 dan b = 3, berapa nilai a\u00b2 - b\u00b2?","o":["14","16","18","20"],"a":1},
    {"sec":"Verbal","q":"Sinonim kata \"ANDAL\" adalah...","o":["Lemah","Terpercaya","Lambat","Ragu"],"a":1},
    {"sec":"Verbal","q":"Antonim kata \"EFISIEN\" adalah...","o":["Hemat","Boros","Cepat","Rapi"],"a":1},
    {"sec":"Verbal","q":"Penulis : Artikel = Sutradara : ...","o":["Kamera","Film","Aktor","Skenario"],"a":1},
    {"sec":"Verbal","q":"Manakah yang TIDAK sekelompok?","o":["Instagram","TikTok","Excel","YouTube"],"a":2},
    {"sec":"Verbal","q":"Sinonim kata \"PERSUASIF\" adalah...","o":["Memaksa","Meyakinkan","Membingungkan","Menolak"],"a":1},
    {"sec":"Verbal","q":"Antonim kata \"OPTIMIS\" adalah...","o":["Yakin","Positif","Pesimis","Percaya diri"],"a":2},
    {"sec":"Verbal","q":"Dokter : Pasien = Guru : ...","o":["Sekolah","Murid","Buku","Kelas"],"a":1},
    {"sec":"Verbal","q":"Sinonim kata \"GIGIH\" adalah...","o":["Malas","Pantang menyerah","Ragu-ragu","Lemah"],"a":1},
    {"sec":"Verbal","q":"Manakah yang TIDAK sekelompok?","o":["Apel","Jeruk","Wortel","Mangga"],"a":2},
    {"sec":"Verbal","q":"Antonim kata \"KONSISTEN\" adalah...","o":["Stabil","Berubah-ubah","Teratur","Rapi"],"a":1},
    {"sec":"Verbal","q":"Nelayan : Laut = Petani : ...","o":["Sawah","Pasar","Cangkul","Padi"],"a":0},
    {"sec":"Verbal","q":"Sinonim kata \"INOVATIF\" adalah...","o":["Kreatif","Kaku","Kuno","Pasif"],"a":0},
    {"sec":"Verbal","q":"Manakah yang TIDAK sekelompok?","o":["Gitar","Piano","Drum","Lukisan"],"a":3},
    {"sec":"Verbal","q":"Antonim kata \"TRANSPARAN\" adalah...","o":["Jelas","Jujur","Tersembunyi","Terbuka"],"a":2},
    {"sec":"Verbal","q":"Kapten : Kapal = Pilot : ...","o":["Bandara","Pesawat","Penumpang","Langit"],"a":1},
    {"sec":"Spasial","q":"Jika sebuah kubus dipotong tepat di tengah secara horizontal, bentuk potongan melintangnya adalah...","o":["Segitiga","Persegi","Lingkaran","Segilima"],"a":1},
    {"sec":"Spasial","q":"Berapa jumlah sisi pada sebuah kubus?","o":["4","6","8","12"],"a":1},
    {"sec":"Spasial","q":"Jika Anda melipat selembar kertas persegi menjadi dua kali, lalu dua kali lagi, berapa lapisan kertas yang terbentuk?","o":["2","4","6","8"],"a":1},
    {"sec":"Spasial","q":"Bentuk apa yang terbentuk jika dua segitiga sama kaki digabung pada sisi alasnya?","o":["Persegi","Jajar genjang","Layang-layang atau belah ketupat","Segilima"],"a":2},
    {"sec":"Spasial","q":"Jika sebuah bola dipantulkan menabrak dinding dengan sudut 45\u00b0, pada sudut berapa bola akan memantul?","o":["0\u00b0","45\u00b0","90\u00b0","180\u00b0"],"a":1},
    {"sec":"Spasial","q":"Berapa banyak sisi pada sebuah piramida dengan alas persegi?","o":["4","5","6","8"],"a":1},
    {"sec":"Spasial","q":"Jika Anda melihat jam analog pada pukul 15:00, berapa derajat sudut antara jarum jam dan jarum menit?","o":["45\u00b0","90\u00b0","120\u00b0","180\u00b0"],"a":1},
    {"sec":"Spasial","q":"Sebuah kubus memiliki berapa titik sudut (vertex)?","o":["4","6","8","12"],"a":2},
    {"sec":"Spasial","q":"Jika suatu bentuk 2D diputar 180 derajat dan tampak sama seperti sebelum diputar, bentuk itu memiliki sifat...","o":["Asimetris","Simetri rotasi","Tidak beraturan","Konkaf"],"a":1},
    {"sec":"Spasial","q":"Bayangan cermin dari huruf \"R\" akan tampak seperti...","o":["R normal","R terbalik horizontal (mirror)","R terbalik vertikal","Huruf lain"],"a":1},
    {"sec":"Spasial","q":"Berapa banyak persegi kecil ukuran 1x1 dalam sebuah persegi besar ukuran 4x4?","o":["8","12","16","20"],"a":2},
    {"sec":"Spasial","q":"Jika sebuah silinder dipotong tegak lurus terhadap sumbunya, bentuk potongannya adalah...","o":["Persegi","Lingkaran","Segitiga","Oval"],"a":1},
    {"sec":"Spasial","q":"Dari atas, sebuah kerucut akan terlihat berbentuk...","o":["Segitiga","Lingkaran","Persegi","Oval"],"a":1},
    {"sec":"Spasial","q":"Jika dua persegi digabung berdampingan pada satu sisi, bentuk gabungannya adalah...","o":["Persegi lebih besar","Persegi panjang","Segitiga","Trapesium"],"a":1},
    {"sec":"Spasial","q":"Berapa banyak sisi pada sebuah prisma segitiga?","o":["3","4","5","6"],"a":2}
  ]')
ON CONFLICT (id) DO NOTHING;
