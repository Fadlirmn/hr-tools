-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Posisi Baru',
  weights JSONB NOT NULL DEFAULT '{}'
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  psikotes JSONB DEFAULT NULL,
  interview JSONB DEFAULT NULL,
  onboarding JSONB DEFAULT NULL
);

-- Insert default positions
INSERT INTO positions (id, name, weights) VALUES
  ('copywriter', 'Copywriter / Scriptwriter', '{"exp":3,"skill":3,"portfolio":3,"achiev":2,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":2}'),
  ('videoeditor', 'Video Editor', '{"exp":3,"skill":3,"portfolio":3,"achiev":1,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":1}'),
  ('creator', 'Content Creator / Talent', '{"exp":2,"skill":2,"portfolio":3,"achiev":2,"edu":1,"stability":1,"fit":3,"salary":1,"cvquality":1,"soft":3}'),
  ('sosmed', 'Social Media Admin', '{"exp":2,"skill":3,"portfolio":2,"achiev":2,"edu":1,"stability":2,"fit":2,"salary":1,"cvquality":2,"soft":2}'),
  ('designer', 'Graphic Designer', '{"exp":3,"skill":3,"portfolio":3,"achiev":1,"edu":1,"stability":1,"fit":2,"salary":1,"cvquality":1,"soft":1}'),
  ('admin', 'Admin Marketplace / Olshop', '{"exp":2,"skill":2,"portfolio":1,"achiev":1,"edu":1,"stability":3,"fit":2,"salary":1,"cvquality":3,"soft":2}')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- RLS: HR can do everything
CREATE POLICY "hr_all_positions" ON positions FOR ALL USING (true);
CREATE POLICY "hr_all_candidates" ON candidates FOR ALL USING (true);

-- RLS: Candidates can only read their own data
CREATE POLICY "candidate_read_own" ON candidates FOR SELECT
  USING (user_id = auth.uid());

-- Exam questions: satu baris per tipe soal, data sebagai JSON
CREATE TABLE IF NOT EXISTS exam_questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('cog','trait','sjt')),
  label TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '[]'
);

ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_all_exam" ON exam_questions FOR ALL USING (true);

-- Insert default questions from constants (dijalankan sekali)
INSERT INTO exam_questions (id, type, label, data) VALUES
  ('psi_cog', 'cog', 'Tes Kognitif', '[
    {"sec":"A. Logika & Penalaran","q":"Semua karyawan tetap datang sebelum jam 8. Budi datang jam 9. Maka...","o":["Budi karyawan rajin","Budi bukan karyawan tetap","Budi karyawan teladan","Tidak ada kesimpulan"],"a":1},
    {"sec":"A. Logika & Penalaran","q":"Deret angka: 2, 4, 8, 16, ... Angka berikutnya?","o":["24","30","32","20"],"a":2},
    {"sec":"A. Logika & Penalaran","q":"Deret huruf: A, C, E, G, ... Huruf berikutnya?","o":["H","I","J","K"],"a":1},
    {"sec":"A. Logika & Penalaran","q":"Jika hari ini Selasa, 3 hari lagi jatuh pada hari...","o":["Kamis","Jumat","Sabtu","Rabu"],"a":1},
    {"sec":"A. Logika & Penalaran","q":"Semua mawar adalah bunga. Sebagian bunga berwarna merah. Maka...","o":["Semua mawar merah","Sebagian mawar pasti merah","Belum tentu semua mawar merah","Mawar bukan bunga"],"a":2},
    {"sec":"B. Numerik","q":"Harga produk Rp80.000 didiskon 25%. Harga setelah diskon?","o":["Rp55.000","Rp60.000","Rp65.000","Rp20.000"],"a":1},
    {"sec":"B. Numerik","q":"Berapa 15% dari 200?","o":["20","25","30","35"],"a":2},
    {"sec":"B. Numerik","q":"3 editor menghasilkan 12 video/hari. Berapa video 5 editor/hari (kecepatan sama)?","o":["15","18","20","24"],"a":2},
    {"sec":"B. Numerik","q":"Rata-rata dari 10, 20, 30, 40 adalah...","o":["20","25","30","35"],"a":1},
    {"sec":"B. Numerik","q":"Stok 50 item naik 20%. Jumlah baru?","o":["55","58","60","70"],"a":2},
    {"sec":"C. Verbal","q":"Sinonim kata \"ANDAL\" adalah...","o":["Lemah","Terpercaya","Lambat","Ragu"],"a":1},
    {"sec":"C. Verbal","q":"Antonim kata \"EFISIEN\" adalah...","o":["Hemat","Boros","Cepat","Rapi"],"a":1},
    {"sec":"C. Verbal","q":"Penulis : Artikel = Sutradara : ...","o":["Kamera","Film","Aktor","Skenario"],"a":1},
    {"sec":"C. Verbal","q":"Manakah yang TIDAK sekelompok?","o":["Instagram","TikTok","Excel","YouTube"],"a":2},
    {"sec":"C. Verbal","q":"Sinonim kata \"PERSUASIF\" adalah...","o":["Memaksa","Meyakinkan","Membingungkan","Menolak"],"a":1}
  ]'),
  ('psi_trait', 'trait', 'Profil Kepribadian', '[
    {"t":"Inisiatif","q":"Saya terbiasa mengambil tindakan tanpa menunggu diperintah."},
    {"t":"Inisiatif","q":"Saya berani mencoba ide baru meski ada risiko gagal."},
    {"t":"Ketelitian","q":"Saya selalu memeriksa ulang pekerjaan sebelum dikirim."},
    {"t":"Ketelitian","q":"Detail kecil sangat penting bagi saya."},
    {"t":"Kerja sama","q":"Saya nyaman bekerja dalam tim dan berbagi tugas."},
    {"t":"Kerja sama","q":"Saya mudah menerima masukan dari rekan kerja."},
    {"t":"Tahan tekanan","q":"Saya tetap tenang saat deadline mepet."},
    {"t":"Tahan tekanan","q":"Tekanan kerja justru membuat saya lebih fokus."},
    {"t":"Orientasi hasil","q":"Saya fokus menyelesaikan target, bukan sekadar terlihat sibuk."},
    {"t":"Orientasi hasil","q":"Saya terbiasa menetapkan target harian untuk diri sendiri."}
  ]'),
  ('psi_sjt', 'sjt', 'Tes Situasional & Integritas', '[
    {"q":"Anda tahu rekan memanipulasi laporan jam kerja. Yang Anda lakukan?","o":[["Diam saja, bukan urusan saya",0],["Ikut karena banyak yang begitu",0],["Mengingatkan rekan secara pribadi",2],["Melaporkan ke atasan sesuai prosedur",3]]},
    {"q":"Deadline mepet, hasil kerja belum sempurna. Anda...","o":[["Kirim apa adanya tanpa keterangan",1],["Kirim tepat waktu + catatan bagian yang perlu revisi",3],["Telat tanpa kabar demi sempurna",1],["Minta rekan mengerjakan diam-diam",0]]},
    {"q":"Klien minta klaim produk yang berlebihan/menyesatkan. Anda...","o":[["Turuti saja demi closing",0],["Tolak total tanpa solusi",1],["Tawarkan klaim menarik yang tetap jujur & sesuai aturan",3],["Serahkan ke orang lain",1]]},
    {"q":"Anda membuat kesalahan yang merugikan tim. Anda...","o":[["Sembunyikan agar tak ketahuan",0],["Salahkan sistem atau orang lain",0],["Akui dan ajukan solusi perbaikan",3],["Akui tapi tidak melakukan apa-apa",1]]},
    {"q":"Rekan baru kesulitan padahal Anda sedang sibuk. Anda...","o":[["Abaikan, bukan tugas saya",0],["Bantu seperlunya / arahkan ke sumber bantuan",3],["Kerjakan semua untuknya",1],["Suruh tanya atasan saja",1]]}
  ]')
ON CONFLICT (id) DO NOTHING;
