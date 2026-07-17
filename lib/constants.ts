import type { PositionDefault, CvCriterion, PsiCogQuestion, PsiTraitQuestion, PsiSjtQuestion, IntCompetency, OnboardingGroup } from './types'

export const STAGES: Record<string, string> = {
  screening: 'Screening CV',
  psikotes: 'Psikotes',
  interview: 'Interview',
  offer: 'Offering',
  onboarding: 'Onboarding',
  hired: 'Diterima',
  rejected: 'Ditolak',
}

export const POSITIONS_DEFAULT: PositionDefault[] = [
  {
    id: 'copywriter', name: 'Copywriter / Scriptwriter',
    weights: { exp: 3, skill: 3, portfolio: 3, achiev: 2, edu: 1, stability: 1, fit: 2, salary: 1, cvquality: 1, soft: 2 },
  },
  {
    id: 'videoeditor', name: 'Video Editor',
    weights: { exp: 3, skill: 3, portfolio: 3, achiev: 1, edu: 1, stability: 1, fit: 2, salary: 1, cvquality: 1, soft: 1 },
  },
  {
    id: 'creator', name: 'Content Creator / Talent',
    weights: { exp: 2, skill: 2, portfolio: 3, achiev: 2, edu: 1, stability: 1, fit: 3, salary: 1, cvquality: 1, soft: 3 },
  },
  {
    id: 'sosmed', name: 'Social Media Admin',
    weights: { exp: 2, skill: 3, portfolio: 2, achiev: 2, edu: 1, stability: 2, fit: 2, salary: 1, cvquality: 2, soft: 2 },
  },
  {
    id: 'designer', name: 'Graphic Designer',
    weights: { exp: 3, skill: 3, portfolio: 3, achiev: 1, edu: 1, stability: 1, fit: 2, salary: 1, cvquality: 1, soft: 1 },
  },
  {
    id: 'admin', name: 'Admin Marketplace / Olshop',
    weights: { exp: 2, skill: 2, portfolio: 1, achiev: 1, edu: 1, stability: 3, fit: 2, salary: 1, cvquality: 3, soft: 2 },
  },
]

export const CV_CRITERIA: CvCriterion[] = [
  { id: 'exp', name: 'Kesesuaian pengalaman dengan posisi', desc: 'Pengalaman kerja relevan langsung dengan tugas posisi yang dilamar.' },
  { id: 'skill', name: 'Skill teknis & penguasaan tools', desc: 'Menguasai aplikasi/tools yang dibutuhkan (cth. CapCut, Canva, Excel, copywriting).' },
  { id: 'portfolio', name: 'Portofolio / hasil karya', desc: 'Ada link/contoh karya nyata yang relevan dan berkualitas.' },
  { id: 'achiev', name: 'Pencapaian terukur', desc: 'Punya hasil/angka konkret (cth. naikkan views, omzet, follower).' },
  { id: 'edu', name: 'Pendidikan & sertifikasi', desc: 'Latar pendidikan/pelatihan mendukung posisi.' },
  { id: 'stability', name: 'Stabilitas & lama bekerja', desc: 'Tidak terlalu sering pindah kerja tanpa alasan jelas.' },
  { id: 'fit', name: 'Kecocokan budaya & domisili', desc: 'Domisili, kesediaan WFO/jam kerja, dan gaya kerja cocok.' },
  { id: 'salary', name: 'Ekspektasi gaji vs budget', desc: 'Ekspektasi masuk akal dan sesuai anggaran posisi.' },
  { id: 'cvquality', name: 'Kelengkapan & kerapian CV', desc: 'CV lengkap, rapi, mudah dibaca, dan bebas typo.' },
  { id: 'soft', name: 'Indikasi soft skill', desc: 'Terlihat komunikatif, inisiatif, atau pengalaman organisasi/tim.' },
]

export const PSI_COG: PsiCogQuestion[] = [
  { sec: 'A. Logika & Penalaran', q: 'Semua karyawan tetap datang sebelum jam 8. Budi datang jam 9. Maka...', o: ['Budi karyawan rajin', 'Budi bukan karyawan tetap', 'Budi karyawan teladan', 'Tidak ada kesimpulan'], a: 1 },
  { sec: 'A. Logika & Penalaran', q: 'Deret angka: 2, 4, 8, 16, ... Angka berikutnya?', o: ['24', '30', '32', '20'], a: 2 },
  { sec: 'A. Logika & Penalaran', q: 'Deret huruf: A, C, E, G, ... Huruf berikutnya?', o: ['H', 'I', 'J', 'K'], a: 1 },
  { sec: 'A. Logika & Penalaran', q: 'Jika hari ini Selasa, 3 hari lagi jatuh pada hari...', o: ['Kamis', 'Jumat', 'Sabtu', 'Rabu'], a: 1 },
  { sec: 'A. Logika & Penalaran', q: 'Semua mawar adalah bunga. Sebagian bunga berwarna merah. Maka...', o: ['Semua mawar merah', 'Sebagian mawar pasti merah', 'Belum tentu semua mawar merah', 'Mawar bukan bunga'], a: 2 },
  { sec: 'B. Numerik', q: 'Harga produk Rp80.000 didiskon 25%. Harga setelah diskon?', o: ['Rp55.000', 'Rp60.000', 'Rp65.000', 'Rp20.000'], a: 1 },
  { sec: 'B. Numerik', q: 'Berapa 15% dari 200?', o: ['20', '25', '30', '35'], a: 2 },
  { sec: 'B. Numerik', q: '3 editor menghasilkan 12 video/hari. Berapa video 5 editor/hari (kecepatan sama)?', o: ['15', '18', '20', '24'], a: 2 },
  { sec: 'B. Numerik', q: 'Rata-rata dari 10, 20, 30, 40 adalah...', o: ['20', '25', '30', '35'], a: 1 },
  { sec: 'B. Numerik', q: 'Stok 50 item naik 20%. Jumlah baru?', o: ['55', '58', '60', '70'], a: 2 },
  { sec: 'C. Verbal', q: 'Sinonim kata "ANDAL" adalah...', o: ['Lemah', 'Terpercaya', 'Lambat', 'Ragu'], a: 1 },
  { sec: 'C. Verbal', q: 'Antonim kata "EFISIEN" adalah...', o: ['Hemat', 'Boros', 'Cepat', 'Rapi'], a: 1 },
  { sec: 'C. Verbal', q: 'Penulis : Artikel = Sutradara : ...', o: ['Kamera', 'Film', 'Aktor', 'Skenario'], a: 1 },
  { sec: 'C. Verbal', q: 'Manakah yang TIDAK sekelompok?', o: ['Instagram', 'TikTok', 'Excel', 'YouTube'], a: 2 },
  { sec: 'C. Verbal', q: 'Sinonim kata "PERSUASIF" adalah...', o: ['Memaksa', 'Meyakinkan', 'Membingungkan', 'Menolak'], a: 1 },
]

export const PSI_TRAIT: PsiTraitQuestion[] = [
  { t: 'Inisiatif', q: 'Saya terbiasa mengambil tindakan tanpa menunggu diperintah.' },
  { t: 'Inisiatif', q: 'Saya berani mencoba ide baru meski ada risiko gagal.' },
  { t: 'Ketelitian', q: 'Saya selalu memeriksa ulang pekerjaan sebelum dikirim.' },
  { t: 'Ketelitian', q: 'Detail kecil sangat penting bagi saya.' },
  { t: 'Kerja sama', q: 'Saya nyaman bekerja dalam tim dan berbagi tugas.' },
  { t: 'Kerja sama', q: 'Saya mudah menerima masukan dari rekan kerja.' },
  { t: 'Tahan tekanan', q: 'Saya tetap tenang saat deadline mepet.' },
  { t: 'Tahan tekanan', q: 'Tekanan kerja justru membuat saya lebih fokus.' },
  { t: 'Orientasi hasil', q: 'Saya fokus menyelesaikan target, bukan sekadar terlihat sibuk.' },
  { t: 'Orientasi hasil', q: 'Saya terbiasa menetapkan target harian untuk diri sendiri.' },
]

export const PSI_SJT: PsiSjtQuestion[] = [
  { q: 'Anda tahu rekan memanipulasi laporan jam kerja. Yang Anda lakukan?', o: [['Diam saja, bukan urusan saya', 0], ['Ikut karena banyak yang begitu', 0], ['Mengingatkan rekan secara pribadi', 2], ['Melaporkan ke atasan sesuai prosedur', 3]] },
  { q: 'Deadline mepet, hasil kerja belum sempurna. Anda...', o: [['Kirim apa adanya tanpa keterangan', 1], ['Kirim tepat waktu + catatan bagian yang perlu revisi', 3], ['Telat tanpa kabar demi sempurna', 1], ['Minta rekan mengerjakan diam-diam', 0]] },
  { q: 'Klien minta klaim produk yang berlebihan/menyesatkan. Anda...', o: [['Turuti saja demi closing', 0], ['Tolak total tanpa solusi', 1], ['Tawarkan klaim menarik yang tetap jujur & sesuai aturan', 3], ['Serahkan ke orang lain', 1]] },
  { q: 'Anda membuat kesalahan yang merugikan tim. Anda...', o: [['Sembunyikan agar tak ketahuan', 0], ['Salahkan sistem atau orang lain', 0], ['Akui dan ajukan solusi perbaikan', 3], ['Akui tapi tidak melakukan apa-apa', 1]] },
  { q: 'Rekan baru kesulitan padahal Anda sedang sibuk. Anda...', o: [['Abaikan, bukan tugas saya', 0], ['Bantu seperlunya / arahkan ke sumber bantuan', 3], ['Kerjakan semua untuknya', 1], ['Suruh tanya atasan saja', 1]] },
]

export const INT_COMP: IntCompetency[] = [
  { id: 'komunikasi', name: 'Komunikasi & artikulasi', desc: 'Jelas, runtut, percaya diri menyampaikan jawaban.' },
  { id: 'teknis', name: 'Kompetensi teknis sesuai posisi', desc: 'Menjawab pertanyaan teknis dengan tepat & dalam.' },
  { id: 'problem', name: 'Pengalaman & problem solving', desc: 'Punya contoh nyata mengatasi masalah/kasus.' },
  { id: 'motivasi', name: 'Motivasi & culture fit', desc: 'Alasan melamar jelas, nilai cocok dengan tim.' },
  { id: 'sikap', name: 'Profesionalisme & sikap', desc: 'Sopan, tepat waktu, jujur, antusias.' },
  { id: 'potensi', name: 'Potensi berkembang', desc: 'Mau belajar, adaptif, ambisius secara sehat.' },
]

export const ONBOARD: OnboardingGroup[] = [
  { g: 'Administrasi & Legal', items: ['Tanda tangan kontrak kerja / surat perjanjian', 'Lengkapi data diri (KTP, NPWP, no. rekening)', 'Daftarkan BPJS Kesehatan & Ketenagakerjaan', 'Serahkan slip/dokumen pendukung lain'] },
  { g: 'Akun & Akses', items: ['Buatkan email kantor', 'Tambahkan ke grup WhatsApp/Slack tim', 'Beri akses Google Drive / folder kerja', 'Beri akun tools (CapCut, Canva, dashboard TikTok Shop, dll)'] },
  { g: 'Perlengkapan Kerja', items: ['Siapkan laptop/PC & meja kerja', 'Pastikan koneksi & software terpasang', 'Berikan SOP & template kerja'] },
  { g: 'Orientasi (Hari 1–3)', items: ['Perkenalan dengan tim & atasan langsung', 'Penjelasan visi, misi, & nilai perusahaan', 'Product knowledge & gaya brand', 'Tour alur kerja & ekspektasi harian'] },
  { g: 'Probation 30 / 60 / 90 Hari', items: ['Tetapkan target & KPI 30 hari pertama', 'Tunjuk mentor/buddy pendamping', 'Jadwalkan check-in mingguan', 'Evaluasi akhir masa percobaan'] },
]
