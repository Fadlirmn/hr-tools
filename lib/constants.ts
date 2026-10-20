import type { PositionDefault, CvCriterion, DiscQuestion, DiscQuestionMapping, DiscConversionTable, DiscBehavioralGraphMap, DiscProfileDescriptionMap, IqQuestion, IqCategory, IntCompetency, OnboardingGroup } from './types'

export const STAGES: Record<string, string> = {
  screening: 'Screening CV',
  psikotes: 'Tes DISC & IQ',
  interview: 'Interview',
  offer: 'Offering',
  onboarding: 'Onboarding',
  hired: 'Diterima',
  rejected: 'Ditolak',
}

export const POSITIONS_DEFAULT: PositionDefault[] = [
  {
    id: 'marketing', name: 'Marketing',
    weights: { exp: 2, skill: 2, portfolio: 2, achiev: 2, edu: 2, stability: 2, fit: 2, salary: 2, cvquality: 2, soft: 2 },
  },
  {
    id: 'operasional', name: 'Operasional',
    weights: { exp: 2, skill: 2, portfolio: 2, achiev: 2, edu: 2, stability: 2, fit: 2, salary: 2, cvquality: 2, soft: 2 },
  },
  {
    id: 'copywriter', name: 'Copywriter',
    weights: { exp: 2, skill: 2, portfolio: 2, achiev: 2, edu: 2, stability: 2, fit: 2, salary: 2, cvquality: 2, soft: 2 },
  },
  {
    id: 'manager-marketing', name: 'Manager Marketing',
    weights: { exp: 2, skill: 2, portfolio: 2, achiev: 2, edu: 2, stability: 2, fit: 2, salary: 2, cvquality: 2, soft: 2 },
  },
  {
    id: 'creator', name: 'Content Creator / Talent',
    weights: { exp: 2, skill: 2, portfolio: 2, achiev: 2, edu: 2, stability: 2, fit: 2, salary: 2, cvquality: 2, soft: 2 },
  },
  {
    id: 'iklan', name: 'Iklan',
    weights: { exp: 2, skill: 2, portfolio: 2, achiev: 2, edu: 2, stability: 2, fit: 2, salary: 2, cvquality: 2, soft: 2 },
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

// --- Tes DISC (format Personal Profile System / Classical Pattern) ---
// Sumber: diadaptasi dari testdisc.online (24 soal forced-choice, skema skor,
// dan nama pola perilaku) per permintaan eksplisit pengguna. Nama pola
// ("Conductor #1", "Persuader #12", dst) dan tabel konversi skor berasal dari
// sistem Personal Profile System / "Classical Pattern" yang dipopulerkan oleh
// Carlson Learning/Inscape (kini bagian dari Wiley "Everything DiSC"). Teori
// dasar DISC (Marston, 1928) adalah public domain, namun implementasi detail
// (tabel konversi, 60 nama pola, deskripsi) berasal dari sistem komersial
// tersebut dan BUKAN milik proyek ini. Pastikan pemakaian ini sudah sesuai
// kebutuhan dan risiko hukum internal sebelum dipakai di luar konteks screening
// HR internal.
export const DISC_QUESTIONS: DiscQuestion[] = [
  { no: 1, options: { a: 'Lembut, ramah', b: 'Membujuk, meyakinkan', c: 'Sederhana, rendah hati', d: 'Asli, pribadi, pencipta' } },
  { no: 2, options: { a: 'Menarik, mempesona', b: 'Mudah bekerja sama & setuju', c: 'Keras kepala, tidak mudah menyerah', d: 'Manis, menyenangkan' } },
  { no: 3, options: { a: 'Mau dipimpin, mengikuti', b: 'Tangguh, berani', c: 'Loyal, setia, mengabdi', d: 'Mempesona, menyenangkan' } },
  { no: 4, options: { a: 'Berpandangan terbuka, mau menerima', b: 'Tegar, suka menolong', c: 'Tekun, berkemauan keras', d: 'Periang, selalu bergembira' } },
  { no: 5, options: { a: 'Periang, suka bergurau', b: 'Teliti, tepat', c: 'Kasar, berani, kurang sopan, tidak malu', d: 'Tenang, terkendali' } },
  { no: 6, options: { a: 'Kompetitif, selalu ingin berhasil', b: 'Timbang rasa, peduli, bijaksana', c: 'Terbuka, ramah, suka senang-senang', d: 'Harmonis, mudah menyetujui' } },
  { no: 7, options: { a: 'Rewel, cerewet, sulit puas', b: 'Taat, patuh', c: 'Tidak mudah mundur, fokus, ulet', d: 'Suka melucu, lincah, periang' } },
  { no: 8, options: { a: 'Berani, tidak gentar, tangguh', b: 'Membangkitkan semangat, memotivasi', c: 'Patuh, berhasil, menyerah', d: 'Takut-takut, malu, pendiam' } },
  { no: 9, options: { a: 'Suka bergaul dan bersosialisasi', b: 'Sabar, penuh keyakinan, toleransi', c: 'Percaya diri, mandiri', d: 'Halus/lembut, pendiam, menyendiri' } },
  { no: 10, options: { a: 'Menyukai hal baru, suka tantangan', b: 'Terbuka, menerima ide dan saran', c: 'Ramah, hangat, bersahabat', d: 'Moderat, menghindari ekstrim' } },
  { no: 11, options: { a: 'Banyak bicara, cerewet', b: 'Terkendali, mudah diatur', c: 'Melakukan hal biasa, tidak berlebihan', d: 'Tegas, cepat ambil keputusan' } },
  { no: 12, options: { a: 'Berbudi bahasa halus, tingkah laku yg halus', b: 'Berani, suka mengambil resiko', c: 'Diplomatik, bijaksana', d: 'Mudah puas atau senang' } },
  { no: 13, options: { a: 'Agresif, suka tantangan, penuh inisiatif', b: 'Menyukai hiburan, ramah, suka kumpul', c: 'Pengikut, mudah kerjasama orang lain', d: 'Gelisah, khawatir' } },
  { no: 14, options: { a: 'Berhati-hati', b: 'Fokus hal tertentu, tidak mudah goyah', c: 'Meyakinkan', d: 'Baik hati, menyenangkan' } },
  { no: 15, options: { a: 'Rela berkorban, mengikuti arus', b: 'Antusias, selalu ingin tahu', c: 'Mudah menyetujui', d: 'Lincah, antusias' } },
  { no: 16, options: { a: 'Percaya diri, yakin pada diri sendiri', b: 'Simpatik, orang yg pengertian', c: 'Toleran', d: 'Tegas, agresif' } },
  { no: 17, options: { a: 'Disiplin, terkendali', b: 'Dermawan, suka berbagi', c: 'Suka berekspresi, banyak ekspresi', d: 'Gigih, tidak mudah menyerah' } },
  { no: 18, options: { a: 'Terpuji, dapat dikagumi, patut dipuji', b: 'Ramah, senang menolong', c: 'Mudah Menyerah, menerima pendapat', d: 'Memiliki karakter kuat, tangguh' } },
  { no: 19, options: { a: 'Menunjukkan rasa hormat', b: 'Pelopor, perintis, giat, mau berusaha', c: 'Optimis, pandangan positif', d: 'Selalu siap untuk membantu' } },
  { no: 20, options: { a: 'Dapat berargumentasi', b: 'Fleksibel, mudah beradaptasi', c: 'Tak peduli, acuh tak acuh', d: 'Riang, tiada yg dipikirkan sama sekali' } },
  { no: 21, options: { a: 'Dapat dipercaya, percaya kepada orang lain', b: 'Mudah puas, selalu merasa cukup', c: 'Selalu positif, tidak diragukan', d: 'Tenang, Pendiam' } },
  { no: 22, options: { a: 'Mudah bergaul, suka berteman', b: 'Berbudaya, banyak pengetahuan', c: 'Bersemangat, giat', d: 'Toleransi, tidak tegas' } },
  { no: 23, options: { a: 'Menyenangkan, ramah', b: 'Teliti, akurat', c: 'Terus terang, bicara bebas', d: 'Terkendali, emosi yang terkendali' } },
  { no: 24, options: { a: 'Resah, tidak bisa santai', b: 'Baik hati, ramah', c: 'Populer, disukai banyak orang', d: 'Rapi, teratur' } },
]

export const DISC_MOST_MAPPING: DiscQuestionMapping = {
  1: { a: 'S', b: 'I', c: 'C', d: 'X' },
  2: { a: 'I', b: 'C', c: 'D', d: 'X' },
  3: { a: 'X', b: 'D', c: 'S', d: 'I' },
  4: { a: 'C', b: 'S', c: 'X', d: 'I' },
  5: { a: 'X', b: 'C', c: 'X', d: 'S' },
  6: { a: 'D', b: 'S', c: 'X', d: 'X' },
  7: { a: 'X', b: 'S', c: 'D', d: 'I' },
  8: { a: 'D', b: 'I', c: 'X', d: 'X' },
  9: { a: 'I', b: 'S', c: 'D', d: 'C' },
  10: { a: 'D', b: 'C', c: 'X', d: 'S' },
  11: { a: 'I', b: 'S', c: 'X', d: 'D' },
  12: { a: 'X', b: 'D', c: 'C', d: 'S' },
  13: { a: 'D', b: 'I', c: 'S', d: 'X' },
  14: { a: 'C', b: 'D', c: 'I', d: 'S' },
  15: { a: 'S', b: 'X', c: 'C', d: 'X' },
  16: { a: 'I', b: 'X', c: 'X', d: 'D' },
  17: { a: 'C', b: 'S', c: 'X', d: 'D' },
  18: { a: 'I', b: 'S', c: 'X', d: 'D' },
  19: { a: 'C', b: 'D', c: 'I', d: 'S' },
  20: { a: 'D', b: 'C', c: 'X', d: 'I' },
  21: { a: 'S', b: 'X', c: 'D', d: 'C' },
  22: { a: 'I', b: 'X', c: 'D', d: 'S' },
  23: { a: 'I', b: 'C', c: 'D', d: 'X' },
  24: { a: 'D', b: 'S', c: 'I', d: 'C' },
}

export const DISC_LEAST_MAPPING: DiscQuestionMapping = {
  1: { a: 'S', b: 'X', c: 'C', d: 'D' },
  2: { a: 'I', b: 'C', c: 'D', d: 'S' },
  3: { a: 'C', b: 'D', c: 'X', d: 'I' },
  4: { a: 'X', b: 'S', c: 'D', d: 'I' },
  5: { a: 'I', b: 'C', c: 'D', d: 'S' },
  6: { a: 'D', b: 'S', c: 'I', d: 'C' },
  7: { a: 'C', b: 'X', c: 'D', d: 'I' },
  8: { a: 'X', b: 'X', c: 'S', d: 'C' },
  9: { a: 'I', b: 'S', c: 'D', d: 'X' },
  10: { a: 'D', b: 'X', c: 'I', d: 'S' },
  11: { a: 'I', b: 'S', c: 'C', d: 'D' },
  12: { a: 'I', b: 'D', c: 'X', d: 'S' },
  13: { a: 'X', b: 'I', c: 'S', d: 'C' },
  14: { a: 'C', b: 'X', c: 'I', d: 'X' },
  15: { a: 'X', b: 'I', c: 'C', d: 'D' },
  16: { a: 'X', b: 'S', c: 'C', d: 'D' },
  17: { a: 'X', b: 'S', c: 'I', d: 'D' },
  18: { a: 'X', b: 'X', c: 'C', d: 'D' },
  19: { a: 'X', b: 'D', c: 'I', d: 'S' },
  20: { a: 'D', b: 'X', c: 'S', d: 'I' },
  21: { a: 'I', b: 'S', c: 'D', d: 'C' },
  22: { a: 'I', b: 'C', c: 'D', d: 'S' },
  23: { a: 'I', b: 'X', c: 'D', d: 'S' },
  24: { a: 'D', b: 'S', c: 'I', d: 'C' },
}

export const DISC_MOST_CONVERSION_TABLE: DiscConversionTable = {
  D: { 0: 3, 1: 15, 2: 24, 3: 33, 4: 38, 5: 43, 6: 48, 7: 53, 8: 59, 9: 65, 10: 73, 11: 76, 12: 79, 13: 83, 14: 95, 15: 93, 16: 97, 17: 100, 18: 100, 19: 100, 20: 100 },
  I: { 0: 8, 1: 20, 2: 35, 3: 43, 4: 56, 5: 68, 6: 73, 7: 83, 8: 88, 9: 92, 10: 97, 11: 100, 12: 100, 13: 100, 14: 100, 15: 100, 16: 100, 17: 100 },
  S: { 0: 11, 1: 22, 2: 30, 3: 38, 4: 45, 5: 55, 6: 61, 7: 67, 8: 74, 9: 78, 10: 85, 11: 89, 12: 97, 13: 100, 14: 100, 15: 100, 16: 100, 17: 100, 18: 100, 19: 100 },
  C: { 0: 0, 1: 16, 2: 29, 3: 40, 4: 54, 5: 66, 6: 73, 7: 84, 8: 89, 9: 96, 10: 100, 11: 100, 12: 100, 13: 100, 14: 100, 15: 100, 16: 100 },
}

export const DISC_LEAST_CONVERSION_TABLE: DiscConversionTable = {
  D: { 0: 100, 1: 87, 2: 75, 3: 67, 4: 59, 5: 53, 6: 48, 7: 42, 8: 38, 9: 31, 10: 28, 11: 25, 12: 21, 13: 15, 14: 11, 15: 8, 16: 5, 21: 1 },
  I: { 0: 100, 1: 86, 2: 75, 3: 67, 4: 55, 5: 46, 6: 37, 7: 28, 8: 22, 9: 15, 10: 10, 11: 7, 19: 0 },
  S: { 0: 100, 1: 96, 2: 85, 3: 75, 4: 67, 5: 59, 6: 53, 7: 42, 8: 37, 9: 29, 10: 23, 11: 15, 12: 8, 13: 4, 14: 1, 19: 1 },
  C: { 0: 100, 1: 95, 2: 82, 3: 74, 4: 65, 5: 58, 6: 52, 7: 47, 8: 39, 9: 33, 10: 23, 11: 14, 12: 7, 13: 3, 16: 0 },
}

export const DISC_BEHAVIORAL_GRAPH: DiscBehavioralGraphMap = {
  'HCLDLILS': { name: 'Analyzer #7', type: 'C' },
  'HCLILDLS': { name: 'Analyzer #7', type: 'C' },
  'HCHSLDLI': { name: 'Coordinator #21', type: 'C' },
  'HCHSLILD': { name: 'Coordinator #21', type: 'C' },
  'HCHDLILS': { name: 'Implementor #24', type: 'C' },
  'HCHDLSLI': { name: 'Implementor #24', type: 'C' },
  'HCHILSLD': { name: 'Analyzer #60', type: 'C' },
  'HCHILDLS': { name: 'Analyzer #60', type: 'C' },
  'HCHIHDLS': { name: 'Analyzer #55', type: 'C' },
  'HCHDHILS': { name: 'Analyzer #55', type: 'C' },
  'HCHSHDLI': { name: 'Analyzer #38', type: 'C' },
  'HCHDHSLI': { name: 'Analyzer #38', type: 'C' },
  'HDLILCLS': { name: 'Conductor #1', type: 'D' },
  'HDLSLCLI': { name: 'Conductor #1', type: 'D' },
  'HDHILSLC': { name: 'Persuader #12', type: 'D' },
  'HDHILCLS': { name: 'Persuader #12', type: 'D' },
  'HDHCLILS': { name: 'Implementor #9', type: 'D' },
  'HDHCLSLI': { name: 'Implementor #9', type: 'D' },
  'HDHSLILC': { name: 'Conductor #57', type: 'D' },
  'HDHSLCLI': { name: 'Conductor #57', type: 'D' },
  'HDHIHCLS': { name: 'Conductor #27', type: 'D' },
  'HDHCHILS': { name: 'Conductor #27', type: 'D' },
  'HDHSHCLI': { name: 'Conductor #42', type: 'D' },
  'HDHCHSLI': { name: 'Conductor #42', type: 'D' },
  'HDHIHDLS': { name: 'Conductor #27', type: 'D' },
  'HDHCHILD': { name: 'Conductor #42', type: 'D' },
  'HSLCLDLI': { name: 'Supporter #5', type: 'S' },
  'HSLDLILC': { name: 'Supporter #5', type: 'S' },
  'HSLDLCLI': { name: 'Supporter #5', type: 'S' },
  'HSLILCLD': { name: 'Supporter #5', type: 'S' },
  'HSHCLILD': { name: 'Coordinator #20', type: 'S' },
  'HSHCLDLI': { name: 'Coordinator #20', type: 'S' },
  'HSHILDLC': { name: 'Relater #17', type: 'S' },
  'HSHILCLD': { name: 'Relater #17', type: 'S' },
  'HSHDLILC': { name: 'Supporter #59', type: 'S' },
  'HSHDLCLI': { name: 'Supporter #59', type: 'S' },
  'HSHIHDLD': { name: 'Supporter #35', type: 'S' },
  'HSHCHILD': { name: 'Supporter #35', type: 'S' },
  'HSHDHILC': { name: 'Supporter #50', type: 'S' },
  'HSHIHDLC': { name: 'Supporter #50', type: 'S' },
  'HILDLCLS': { name: 'Promoter #3', type: 'I' },
  'HILDLSLD': { name: 'Promoter #3', type: 'I' },
  'HILCLDLS': { name: 'Promoter #3', type: 'I' },
  'HIHDLSLC': { name: 'Persuader #13', type: 'I' },
  'HIHDLCLS': { name: 'Persuader #13', type: 'I' },
  'HIHSLDLC': { name: 'Relater #16', type: 'I' },
  'HIHSLCLD': { name: 'Relater #16', type: 'I' },
  'HIHCLDLS': { name: 'Promoter #58', type: 'I' },
  'HIHCLSLD': { name: 'Promoter #58', type: 'I' },
  'HIHSHCLD': { name: 'Promoter #47', type: 'I' },
  'HIHCHSLD': { name: 'Promoter #47', type: 'I' },
  'HIHSHDLC': { name: 'Promoter #30', type: 'I' },
}

export const DISC_PROFILE_DESCRIPTIONS: DiscProfileDescriptionMap = {
  'Conductor #1': { keyStrengths: ['Mampu menangani masalah sulit dengan banyak isu', 'Berwawasan ke depan, agresif dan kompetitif', 'Mampu bekerja di lingkungan dengan variasi dan perubahan', 'Memulai aktivitas dan menetapkan tempo untuk mencapai hasil'], improveBy: ['Kurangi intensitas, pendapat yang terlalu kuat, dan ketegasan berlebihan', 'Jangan memaksa orang lain yang mungkin tidak seberkomitmen diri sendiri', 'Lebih sabar, peduli terhadap orang, dan rendah hati'], tendencies: { goal: 'Dominasi dan kemandirian', judges: 'Kemampuan menyelesaikan tugas dengan cepat', influence: 'Kekuatan karakter dan persistensi', valueTo: "Sikap 'tunjukkan pada mereka'", overuses: 'Tantangan dan persaingan', underStress: 'Menjadi pendiam dan analitis', fears: 'Kehilangan kendali' } },
  'Persuader #12': { keyStrengths: ['Kemampuan memotivasi dan menginspirasi orang lain', 'Persuasif dan efektif dalam memimpin tim', 'Optimis dan antusias dalam menghadapi tantangan', 'Kemampuan membangun relasi yang kuat'], improveBy: ['Lebih perhatian terhadap detail dan follow-through', 'Kurangi impulsivitas dalam pengambilan keputusan', 'Lebih mendengarkan sebelum bertindak'], tendencies: { goal: 'Pengaruh melalui kemenangan dan hubungan', judges: 'Kemampuan mempengaruhi orang', influence: 'Antusiasme dan kepercayaan diri', valueTo: 'Pemimpin yang menginspirasi dan memotivasi', overuses: 'Optimisme dan persuasi', underStress: 'Menjadi manipulatif', fears: 'Kehilangan status atau pengaruh' } },
  'Implementor #9': { keyStrengths: ['Kemampuan mengimplementasikan solusi dengan cepat', 'Fokus pada hasil nyata dan terukur', 'Berani mengambil risiko untuk mencapai tujuan', 'Langsung dan to-the-point dalam komunikasi'], improveBy: ['Lebih mempertimbangkan dampak terhadap orang lain', 'Kurangi kecenderungan terlalu mengontrol', 'Lebih fleksibel dalam pendekatan'], tendencies: { goal: 'Hasil konkret dan pencapaian', judges: 'Efisiensi dan produktivitas', influence: 'Tindakan langsung dan kepemimpinan', valueTo: 'Implementasi solusi yang cepat', overuses: 'Kecepatan dan kendali', underStress: 'Menjadi diktator', fears: 'Tidak mencapai target' } },
  'Conductor #27': { keyStrengths: ['Kepemimpinan yang kuat dan tegas', 'Kemampuan mengorganisasi dan mendelegasikan', 'Berorientasi pada hasil dengan standar tinggi', 'Kemampuan membuat keputusan di bawah tekanan'], improveBy: ['Lebih empati terhadap perasaan orang lain', 'Kurangi kecenderungan terlalu direktif', 'Lebih terbuka terhadap masukan'], tendencies: { goal: 'Kontrol dan efisiensi', judges: 'Kinerja tim secara keseluruhan', influence: 'Otoritas dan keahlian', valueTo: 'Pemimpin yang menyelesaikan pekerjaan', overuses: 'Kontrol dan dominasi', underStress: 'Menjadi otoriter', fears: 'Kehilangan wewenang' } },
  'Conductor #42': { keyStrengths: ['Mampu memimpin dengan visi yang jelas', 'Menetapkan standar tinggi bagi diri sendiri dan tim', 'Kemampuan mengintegrasikan orang dan tugas', 'Tegas namun menghargai kontribusi tim'], improveBy: ['Lebih fleksibel dalam pendekatan', 'Kurangi ekspektasi yang terlalu tinggi terhadap orang lain', 'Lebih sabar dengan proses'], tendencies: { goal: 'Hasil berkualitas tinggi melalui orang', judges: 'Kualitas output tim', influence: 'Standar tinggi dan kepemimpinan', valueTo: 'Mengintegrasikan orang dan produktivitas', overuses: 'Standar perfeksionistik', underStress: 'Terlalu kritis', fears: 'Kegagalan dan ketidakmampuan' } },
  'Conductor #57': { keyStrengths: ['Stabil dalam kepemimpinan dengan fokus pada konsistensi', 'Membangun kepercayaan melalui reliabilitas', 'Kemampuan mengelola tim yang beragam', 'Pendekatan metodis dalam memecahkan masalah'], improveBy: ['Lebih berani mengambil risiko kalkulatif', 'Lebih adaptif terhadap perubahan cepat', 'Tunjukkan urgensi lebih saat diperlukan'], tendencies: { goal: 'Stabilitas dan kendali', judges: 'Keandalan dan konsistensi', influence: 'Kepercayaan dan keteguhan', valueTo: 'Kepemimpinan yang konsisten dan dapat diandalkan', overuses: 'Rutinitas dan kontrol', underStress: 'Menarik diri', fears: 'Ketidakstabilan' } },
  'Analyzer #7': { keyStrengths: ['Mampu menyelesaikan tugas sulit dengan benar pada percobaan pertama', 'Peka dan sensitif terhadap kesalahan di mana akurasi diperlukan', 'Profesional dan disiplin dalam pendekatan keahliannya', 'Kemampuan organisasi dan manajemen waktu yang baik'], improveBy: ['Kurangi perfeksionisme yang berlebihan', 'Kurangi ketergantungan pada prosedur baku', 'Lebih antusias, kurangi ketergantungan pada data'], tendencies: { goal: 'Akurasi dan kualitas', judges: 'Hasil yang benar, bukti dan fakta', influence: 'Penggunaan data dan ketepatan', valueTo: 'Standar tinggi dan disiplin', overuses: 'Aturan dan regulasi', underStress: 'Terlalu kritis terhadap diri sendiri dan orang lain', fears: 'Keputusan berisiko tinggi' } },
  'Analyzer #55': { keyStrengths: ['Analitis dan sistematis dalam pendekatan', 'Perhatian mendalam terhadap detail dan akurasi', 'Kemampuan evaluasi yang komprehensif', 'Konsisten dalam menjaga standar kualitas'], improveBy: ['Lebih berani berbagi pendapat di forum umum', 'Tingkatkan kecepatan pengambilan keputusan', 'Lebih adaptif dalam situasi ambigu'], tendencies: { goal: 'Ketepatan dan kepatuhan terhadap standar', judges: 'Kualitas data dan proses', influence: 'Expertise dan kompetensi teknis', valueTo: 'Analisis mendalam dan akurasi', overuses: 'Analisis berlebihan', underStress: 'Paralisis analisis', fears: 'Membuat kesalahan' } },
  'Analyzer #60': { keyStrengths: ['Sistematis dan terstruktur dalam pendekatan kerja', 'Mampu mengidentifikasi masalah tersembunyi', 'Konsisten dalam menerapkan standar', 'Kemampuan dokumentasi yang kuat'], improveBy: ['Lebih proaktif dalam berkomunikasi', 'Kurangi ketergantungan berlebih pada prosedur', 'Tingkatkan keterbukaan terhadap ide baru'], tendencies: { goal: 'Sistem dan prosedur yang tepat', judges: 'Kepatuhan dan akurasi', influence: 'Pengetahuan mendalam', valueTo: 'Memastikan standar terpenuhi', overuses: 'Detail dan prosedur', underStress: 'Obsesif terhadap detail', fears: 'Kritik dan kegagalan' } },
  'Analyzer #38': { keyStrengths: ['Kemampuan analisis multi-dimensi', 'Teliti dan akurat dalam semua aspek pekerjaan', 'Kemampuan membangun sistem yang handal', 'Konsisten dalam kualitas output'], improveBy: ['Tingkatkan kecepatan dalam pengambilan keputusan', 'Lebih percaya diri dalam menyampaikan rekomendasi', 'Kurangi kebutuhan validasi eksternal'], tendencies: { goal: 'Ketelitian dan kesempurnaan', judges: 'Kelengkapan dan akurasi', influence: 'Standar dan sistem', valueTo: 'Menjaga integritas proses', overuses: 'Verifikasi berulang', underStress: 'Menjadi obsesif', fears: 'Ketidakakuratan dan kaos' } },
  'Coordinator #21': { keyStrengths: ['Mampu menetapkan dan mencapai standar perilaku dan kerja yang tinggi', 'Peka terhadap masalah, aturan, dan prosedur', 'Mampu membuat keputusan tanpa membiarkan emosi mengganggu', 'Mampu memahami dan menjaga kebutuhan sistem kualitas'], improveBy: ['Lebih berani menyatakan perasaan yang sebenarnya', 'Kurangi kekhawatiran bahwa perubahan dapat merusak hubungan', 'Lebih percaya diri dan saling bergantung'], tendencies: { goal: 'Keamanan dan keteraturan', judges: 'Standar yang tepat', influence: 'Keandalan dan perhatian terhadap detail', valueTo: 'Kesadaran tinggi dan menjaga standar', overuses: 'Ketergantungan pada SOP', underStress: 'Menjadi introvert dan keras kepala', fears: 'Antagonisme' } },
  'Coordinator #20': { keyStrengths: ['Kemampuan mengkoordinasikan berbagai pihak menuju tujuan bersama', 'Membangun konsensus dan harmoni dalam tim', 'Sistematis dan terstruktur dalam pendekatan', 'Dapat diandalkan dan konsisten'], improveBy: ['Lebih berani dalam menghadapi konflik', 'Kurangi kecenderungan menghindari keputusan sulit', 'Tunjukkan inisiatif lebih dalam situasi baru'], tendencies: { goal: 'Harmoni dan koordinasi', judges: 'Keselarasan tim dan proses', influence: 'Kerja sama dan stabilitas', valueTo: 'Menjaga keselarasan dan efisiensi', overuses: 'Konsensus dan kesepakatan', underStress: 'Ragu-ragu', fears: 'Konflik dan perubahan mendadak' } },
  'Implementor #24': { keyStrengths: ['Kemampuan eksekusi yang cepat dengan standar tinggi', 'Mengintegrasikan kualitas dengan kecepatan', 'Fokus pada implementasi praktis', 'Berorientasi solusi dalam menghadapi tantangan'], improveBy: ['Lebih mempertimbangkan perspektif orang lain', 'Lebih sabar dalam proses kolaborasi', 'Kurangi kecenderungan terlalu kritis'], tendencies: { goal: 'Implementasi berkualitas tinggi', judges: 'Efisiensi dan standar', influence: 'Kompetensi dan tindakan', valueTo: 'Mengeksekusi dengan presisi', overuses: 'Standar tinggi dan kendali', underStress: 'Terlalu kritis dan menuntut', fears: 'Pekerjaan yang tidak berkualitas' } },
  'Supporter #5': { keyStrengths: ['Mampu tampil tenang dan terkendali, menggunakan kemampuan konsentrasi untuk mendengarkan', 'Mampu bertahan dengan tugas yang memberikan kontribusi berarti', 'Anggota tim yang terbuka, sabar, dan toleran terhadap perbedaan', 'Senang memuji orang lain'], improveBy: ['Menunjukkan urgensi saat diperlukan', 'Kurangi ketergantungan pada rutinitas', 'Lebih berinisiatif dan adaptif terhadap perubahan'], tendencies: { goal: 'Keandalan dan stabilitas', judges: 'Konsistensi mereka', influence: 'Watak yang ramah, melayani orang lain', valueTo: 'Menstabilkan lingkungan dengan cara yang ramah', overuses: 'Ketenangan dan komposur', underStress: 'Non-ekspresif', fears: 'Tidak dihargai dan hal yang tidak diketahui' } },
  'Supporter #35': { keyStrengths: ['Konsisten dan dapat diandalkan dalam peran supportif', 'Kemampuan membangun kepercayaan jangka panjang', 'Sabar dan teliti dalam pekerjaan', 'Setia dan berdedikasi terhadap tim'], improveBy: ['Lebih berani menyampaikan pendapat', 'Tingkatkan fleksibilitas dalam menghadapi perubahan', 'Lebih proaktif dalam mengambil inisiatif'], tendencies: { goal: 'Keamanan dan stabilitas', judges: 'Loyalitas dan konsistensi', influence: 'Kesetiaan dan dedikasi', valueTo: 'Stabilitas dan dukungan yang konsisten', overuses: 'Rutinitas dan keamanan', underStress: 'Menarik diri dan pasif', fears: 'Perubahan mendadak dan konflik' } },
  'Supporter #50': { keyStrengths: ['Kemampuan membangun tim yang stabil dan harmonis', 'Efektif dalam situasi yang membutuhkan kesabaran', 'Kemampuan mendengarkan yang sangat baik', 'Mampu menjembatani perbedaan dalam tim'], improveBy: ['Lebih tegas dalam mengkomunikasikan kebutuhan', 'Tingkatkan kemampuan dalam menghadapi situasi berubah cepat', 'Lebih percaya diri dalam mengambil kepemimpinan'], tendencies: { goal: 'Harmoni dan stabilitas', judges: 'Keselarasan dan kerjasama', influence: 'Kesabaran dan dukungan', valueTo: 'Menjaga keharmonisan tim', overuses: 'Akomodasi berlebihan', underStress: 'Terlalu pasif', fears: 'Kehilangan stabilitas dan dukungan' } },
  'Supporter #59': { keyStrengths: ['Dapat diandalkan dalam situasi penuh tekanan', 'Mampu menstabilkan situasi yang penuh ketidakpastian', 'Konsisten dalam menjaga hubungan baik', 'Kemampuan memediasi konflik secara efektif'], improveBy: ['Lebih asertif dalam mengekspresikan kebutuhan', 'Lebih adaptif terhadap perubahan', 'Tunjukkan lebih banyak inisiatif'], tendencies: { goal: 'Stabilitas dan harmoni', judges: 'Konsistensi hubungan', influence: 'Keandalan dan empati', valueTo: 'Menjaga stabilitas tim', overuses: 'Kesabaran dan konsistensi berlebihan', underStress: 'Menjadi submisif', fears: 'Konflik dan instabilitas' } },
  'Promoter #3': { keyStrengths: ['Sangat optimis dengan rasa humor yang positif', 'Fokus pada orang dan kepercayaan tinggi dalam hubungan', 'Cepat membangun persahabatan dan menyukai networking', 'Menggunakan pendekatan konsensus dalam pengambilan keputusan'], improveBy: ['Tetap fokus pada tujuan karir', 'Kurangi kekhawatiran berlebih terhadap perasaan orang lain', 'Lebih terorganisir dan realistis'], tendencies: { goal: 'Obliging dan akomodatif', judges: 'Kehangatan', influence: 'Keramahan dan keterampilan interpersonal', valueTo: "Mengkomunikasikan 'big dream', menyatukan tim", overuses: 'Ketergantungan pada orang lain dan optimisme', underStress: 'Emosional dan terlalu percaya', fears: 'Tidak cukup disukai' } },
  'Promoter #30': { keyStrengths: ['Sangat efektif dalam mempromosikan ide dan inisiatif', 'Membangun antusiasme dalam tim', 'Kemampuan meyakinkan orang lain yang sangat baik', 'Energetik dan bersemangat dalam pendekatan'], improveBy: ['Lebih konsisten dalam follow-through', 'Kurangi kecenderungan overcommit', 'Lebih realistis dalam penilaian'], tendencies: { goal: 'Pengakuan dan pengaruh', judges: 'Antusiasme dan penerimaan', influence: 'Karisma dan energi', valueTo: 'Membangkitkan semangat dan energi tim', overuses: 'Optimisme yang tidak realistis', underStress: 'Bereaksi berlebihan', fears: 'Penolakan dan kehilangan popularitas' } },
  'Promoter #47': { keyStrengths: ['Kemampuan membangun hubungan yang sangat kuat', 'Optimis dan inspiratif dalam setiap situasi', 'Efektif dalam menciptakan antusiasme kolektif', 'Kemampuan komunikasi yang sangat baik'], improveBy: ['Lebih fokus pada detail dan implementasi', 'Kurangi kecenderungan menghindari konflik', 'Tingkatkan kemampuan dalam pengambilan keputusan sulit'], tendencies: { goal: 'Hubungan positif dan pengaruh', judges: 'Harmoni dan antusiasme', influence: 'Kepribadian yang menarik', valueTo: 'Menciptakan lingkungan yang positif', overuses: 'Penghindaran konflik', underStress: 'Menjadi tidak tegas', fears: 'Harmoni terganggu dan penolakan' } },
  'Promoter #58': { keyStrengths: ['Kemampuan promosi dan persuasi yang tinggi', 'Sangat efektif dalam peran yang membutuhkan antusiasme', 'Membangun jaringan yang luas dengan mudah', 'Kemampuan mengkomunikasikan visi secara inspiratif'], improveBy: ['Lebih sistematis dalam pendekatan', 'Tingkatkan kemampuan manajemen detail', 'Kurangi ketergantungan pada hubungan interpersonal'], tendencies: { goal: 'Pengakuan dan pengaruh luas', judges: 'Dampak dan penerimaan', influence: 'Karisma dan networking', valueTo: 'Promosi dan penjualan ide', overuses: 'Charm dan persuasi', underStress: 'Menghindari tanggung jawab', fears: 'Kehilangan pengaruh' } },
  'Relater #16': { keyStrengths: ['Kemampuan membangun hubungan yang mendalam dan bermakna', 'Empatik dan peka terhadap kebutuhan orang lain', 'Efektif dalam peran mediasi dan konseling', 'Menciptakan lingkungan yang aman dan terpercaya'], improveBy: ['Lebih tegas dalam menghadapi konflik', 'Kurangi kecenderungan terlalu mengakomodasi', 'Lebih fokus pada tujuan jangka panjang'], tendencies: { goal: 'Hubungan bermakna dan harmoni', judges: 'Kedalaman hubungan', influence: 'Empati dan kepercayaan', valueTo: 'Membangun kepercayaan dan loyalitas', overuses: 'Akomodasi berlebihan', underStress: 'Terlalu sensitif', fears: 'Penolakan dan konflik interpersonal' } },
  'Relater #17': { keyStrengths: ['Sangat andal dalam membangun dan menjaga hubungan', 'Kemampuan mendengarkan aktif yang luar biasa', 'Konsisten dalam dukungan terhadap orang lain', 'Menciptakan rasa aman dalam interaksi tim'], improveBy: ['Lebih proaktif dalam mengambil keputusan', 'Kurangi ketergantungan berlebih pada persetujuan orang lain', 'Tingkatkan kemampuan dalam situasi yang membutuhkan ketegasan'], tendencies: { goal: 'Hubungan yang stabil dan terpercaya', judges: 'Kualitas hubungan', influence: 'Kepercayaan dan keandalan', valueTo: 'Membangun fondasi kepercayaan', overuses: 'Kesabaran dan toleransi', underStress: 'Menjadi terlalu bergantung', fears: 'Konflik dan penolakan' } },
  'Persuader #13': { keyStrengths: ['Sangat persuasif dengan kemampuan komunikasi tinggi', 'Membangun koalisi dan dukungan dengan mudah', 'Berani dan percaya diri dalam presentasi', 'Mampu menginspirasi tindakan melalui kata-kata'], improveBy: ['Lebih perhatian terhadap data dan fakta', 'Kurangi overselling atau janji berlebih', 'Lebih konsisten dalam follow-up'], tendencies: { goal: 'Pengaruh dan penerimaan', judges: 'Respons orang terhadap komunikasi', influence: 'Persuasi dan karisma verbal', valueTo: 'Advokasi dan representasi yang kuat', overuses: 'Persuasi dan optimisme', underStress: 'Menjadi terlalu ekspresif', fears: 'Penolakan publik' } },
}

// --- Tes IQ ---
export const IQ_QUESTIONS: IqQuestion[] = [
  // Logika (15)
  { sec: 'Logika', q: 'Semua karyawan tetap datang sebelum jam 8. Budi datang jam 9. Maka...', o: ['Budi karyawan rajin', 'Budi bukan karyawan tetap', 'Budi karyawan teladan', 'Tidak ada kesimpulan'], a: 1 },
  { sec: 'Logika', q: 'Semua mawar adalah bunga. Sebagian bunga berwarna merah. Maka...', o: ['Semua mawar merah', 'Sebagian mawar pasti merah', 'Belum tentu semua mawar merah', 'Mawar bukan bunga'], a: 2 },
  { sec: 'Logika', q: 'Jika hari ini Selasa, 3 hari lagi jatuh pada hari...', o: ['Kamis', 'Jumat', 'Sabtu', 'Rabu'], a: 1 },
  { sec: 'Logika', q: 'A lebih tinggi dari B. B lebih tinggi dari C. Maka...', o: ['C lebih tinggi dari A', 'A lebih tinggi dari C', 'A sama tinggi dengan C', 'Tidak ada kesimpulan'], a: 1 },
  { sec: 'Logika', q: 'Semua kucing adalah mamalia. Tidak ada mamalia yang bertelur. Maka...', o: ['Beberapa kucing bertelur', 'Semua kucing bertelur', 'Tidak ada kucing yang bertelur', 'Tidak ada kesimpulan'], a: 2 },
  { sec: 'Logika', q: 'Jika semua X adalah Y, dan beberapa Y adalah Z, maka...', o: ['Semua X adalah Z', 'Beberapa X mungkin Z', 'Tidak ada X yang Z', 'X dan Z tidak berhubungan'], a: 1 },
  { sec: 'Logika', q: 'Budi selalu berbohong. Budi berkata "saya berkata benar". Maka pernyataan itu...', o: ['Benar', 'Salah', 'Paradoks', 'Tidak relevan'], a: 2 },
  { sec: 'Logika', q: 'Jika tidak hujan maka saya jalan kaki. Saya tidak jalan kaki. Maka...', o: ['Hujan', 'Tidak hujan', 'Tidak bisa disimpulkan', 'Saya naik motor'], a: 0 },
  { sec: 'Logika', q: 'Lima orang duduk melingkar. A di kanan B, B di kanan C. Posisi C terhadap A adalah...', o: ['Di kanan A', 'Di kiri A', 'Berhadapan dengan A', 'Tidak bisa ditentukan'], a: 3 },
  { sec: 'Logika', q: 'Semua yang tajam dapat memotong. Pisau ini tajam. Maka...', o: ['Pisau ini dapat memotong', 'Pisau ini tidak tajam', 'Pisau ini tumpul', 'Tidak ada kesimpulan'], a: 0 },
  { sec: 'Logika', q: 'Jika A maka B. Jika B maka C. A benar. Maka...', o: ['C pasti benar', 'C pasti salah', 'C tidak bisa ditentukan', 'B pasti salah'], a: 0 },
  { sec: 'Logika', q: 'Tidak semua burung bisa terbang. Penguin adalah burung. Maka...', o: ['Penguin pasti bisa terbang', 'Penguin pasti tidak bisa terbang', 'Belum tentu penguin bisa terbang', 'Penguin bukan burung'], a: 2 },
  { sec: 'Logika', q: 'Dari 3 kotak, hanya 1 berisi hadiah. Kotak A bertuliskan "hadiah ada di sini", kotak B "hadiah tidak di A", kotak C "hadiah tidak di sini". Jika hanya satu tulisan benar, di mana hadiahnya?', o: ['A', 'B', 'C', 'Tidak bisa ditentukan'], a: 1 },
  { sec: 'Logika', q: 'Semua anggota tim hadir rapat kecuali yang sakit. Rina tidak hadir. Maka...', o: ['Rina pasti sakit', 'Rina mungkin sakit', 'Rina pasti sehat', 'Rina bukan anggota tim'], a: 1 },
  { sec: 'Logika', q: 'Jika harga naik maka permintaan turun. Permintaan tidak turun. Maka...', o: ['Harga naik', 'Harga tidak naik', 'Harga tetap', 'Tidak ada hubungan'], a: 1 },
  // Numerik (15)
  { sec: 'Numerik', q: 'Harga produk Rp80.000 didiskon 25%. Harga setelah diskon?', o: ['Rp55.000', 'Rp60.000', 'Rp65.000', 'Rp20.000'], a: 1 },
  { sec: 'Numerik', q: 'Berapa 15% dari 200?', o: ['20', '25', '30', '35'], a: 2 },
  { sec: 'Numerik', q: '3 editor menghasilkan 12 video/hari. Berapa video 5 editor/hari (kecepatan sama)?', o: ['15', '18', '20', '24'], a: 2 },
  { sec: 'Numerik', q: 'Rata-rata dari 10, 20, 30, 40 adalah...', o: ['20', '25', '30', '35'], a: 1 },
  { sec: 'Numerik', q: 'Stok 50 item naik 20%. Jumlah baru?', o: ['55', '58', '60', '70'], a: 2 },
  { sec: 'Numerik', q: 'Deret angka: 2, 4, 8, 16, ... Angka berikutnya?', o: ['24', '30', '32', '20'], a: 2 },
  { sec: 'Numerik', q: 'Deret angka: 1, 4, 9, 16, 25, ... Angka berikutnya?', o: ['30', '36', '32', '49'], a: 1 },
  { sec: 'Numerik', q: 'Jika 3x + 5 = 20, maka x = ?', o: ['3', '4', '5', '6'], a: 2 },
  { sec: 'Numerik', q: 'Sebuah mobil menempuh 180 km dalam 3 jam. Berapa km/jam rata-ratanya?', o: ['50', '60', '70', '80'], a: 1 },
  { sec: 'Numerik', q: 'Deret: 100, 90, 81, 73, ... Pola pengurangan berkurang 1 tiap langkah. Angka berikutnya?', o: ['64', '65', '66', '67'], a: 1 },
  { sec: 'Numerik', q: 'Perbandingan 2:3 jika total 50, maka nilai bagian pertama adalah...', o: ['18', '20', '22', '25'], a: 1 },
  { sec: 'Numerik', q: 'Jika 1 lusin = 12 buah, berapa total buah dalam 7 lusin?', o: ['72', '80', '84', '96'], a: 2 },
  { sec: 'Numerik', q: 'Modal Rp1.000.000 untung 12% per tahun. Setelah 1 tahun jadi berapa?', o: ['Rp1.100.000', 'Rp1.120.000', 'Rp1.200.000', 'Rp1.012.000'], a: 1 },
  { sec: 'Numerik', q: 'Deret: 3, 6, 11, 18, 27, ... (selisih bertambah 2 setiap langkah). Angka berikutnya?', o: ['36', '38', '40', '35'], a: 0 },
  { sec: 'Numerik', q: 'Jika a = 5 dan b = 3, berapa nilai a² - b²?', o: ['14', '16', '18', '20'], a: 1 },
  // Verbal (15)
  { sec: 'Verbal', q: 'Sinonim kata "ANDAL" adalah...', o: ['Lemah', 'Terpercaya', 'Lambat', 'Ragu'], a: 1 },
  { sec: 'Verbal', q: 'Antonim kata "EFISIEN" adalah...', o: ['Hemat', 'Boros', 'Cepat', 'Rapi'], a: 1 },
  { sec: 'Verbal', q: 'Penulis : Artikel = Sutradara : ...', o: ['Kamera', 'Film', 'Aktor', 'Skenario'], a: 1 },
  { sec: 'Verbal', q: 'Manakah yang TIDAK sekelompok?', o: ['Instagram', 'TikTok', 'Excel', 'YouTube'], a: 2 },
  { sec: 'Verbal', q: 'Sinonim kata "PERSUASIF" adalah...', o: ['Memaksa', 'Meyakinkan', 'Membingungkan', 'Menolak'], a: 1 },
  { sec: 'Verbal', q: 'Antonim kata "OPTIMIS" adalah...', o: ['Yakin', 'Positif', 'Pesimis', 'Percaya diri'], a: 2 },
  { sec: 'Verbal', q: 'Dokter : Pasien = Guru : ...', o: ['Sekolah', 'Murid', 'Buku', 'Kelas'], a: 1 },
  { sec: 'Verbal', q: 'Sinonim kata "GIGIH" adalah...', o: ['Malas', 'Pantang menyerah', 'Ragu-ragu', 'Lemah'], a: 1 },
  { sec: 'Verbal', q: 'Manakah yang TIDAK sekelompok?', o: ['Apel', 'Jeruk', 'Wortel', 'Mangga'], a: 2 },
  { sec: 'Verbal', q: 'Antonim kata "KONSISTEN" adalah...', o: ['Stabil', 'Berubah-ubah', 'Teratur', 'Rapi'], a: 1 },
  { sec: 'Verbal', q: 'Nelayan : Laut = Petani : ...', o: ['Sawah', 'Pasar', 'Cangkul', 'Padi'], a: 0 },
  { sec: 'Verbal', q: 'Sinonim kata "INOVATIF" adalah...', o: ['Kreatif', 'Kaku', 'Kuno', 'Pasif'], a: 0 },
  { sec: 'Verbal', q: 'Manakah yang TIDAK sekelompok?', o: ['Gitar', 'Piano', 'Drum', 'Lukisan'], a: 3 },
  { sec: 'Verbal', q: 'Antonim kata "TRANSPARAN" adalah...', o: ['Jelas', 'Jujur', 'Tersembunyi', 'Terbuka'], a: 2 },
  { sec: 'Verbal', q: 'Kapten : Kapal = Pilot : ...', o: ['Bandara', 'Pesawat', 'Penumpang', 'Langit'], a: 1 },
  // Spasial (15)
  { sec: 'Spasial', q: 'Jika sebuah kubus dipotong tepat di tengah secara horizontal, bentuk potongan melintangnya adalah...', o: ['Segitiga', 'Persegi', 'Lingkaran', 'Segilima'], a: 1 },
  { sec: 'Spasial', q: 'Berapa jumlah sisi pada sebuah kubus?', o: ['4', '6', '8', '12'], a: 1 },
  { sec: 'Spasial', q: 'Jika Anda melipat selembar kertas persegi menjadi dua kali, lalu dua kali lagi, berapa lapisan kertas yang terbentuk?', o: ['2', '4', '6', '8'], a: 1 },
  { sec: 'Spasial', q: 'Bentuk apa yang terbentuk jika dua segitiga sama kaki digabung pada sisi alasnya?', o: ['Persegi', 'Jajar genjang', 'Layang-layang atau belah ketupat', 'Segilima'], a: 2 },
  { sec: 'Spasial', q: 'Jika sebuah bola dipantulkan menabrak dinding dengan sudut 45°, pada sudut berapa bola akan memantul?', o: ['0°', '45°', '90°', '180°'], a: 1 },
  { sec: 'Spasial', q: 'Berapa banyak sisi pada sebuah piramida dengan alas persegi?', o: ['4', '5', '6', '8'], a: 1 },
  { sec: 'Spasial', q: 'Jika Anda melihat jam analog pada pukul 15:00, berapa derajat sudut antara jarum jam dan jarum menit?', o: ['45°', '90°', '120°', '180°'], a: 1 },
  { sec: 'Spasial', q: 'Sebuah kubus memiliki berapa titik sudut (vertex)?', o: ['4', '6', '8', '12'], a: 2 },
  { sec: 'Spasial', q: 'Jika suatu bentuk 2D diputar 180 derajat dan tampak sama seperti sebelum diputar, bentuk itu memiliki sifat...', o: ['Asimetris', 'Simetri rotasi', 'Tidak beraturan', 'Konkaf'], a: 1 },
  { sec: 'Spasial', q: 'Bayangan cermin dari huruf "R" akan tampak seperti...', o: ['R normal', 'R terbalik horizontal (mirror)', 'R terbalik vertikal', 'Huruf lain'], a: 1 },
  { sec: 'Spasial', q: 'Berapa banyak persegi kecil ukuran 1x1 dalam sebuah persegi besar ukuran 4x4?', o: ['8', '12', '16', '20'], a: 2 },
  { sec: 'Spasial', q: 'Jika sebuah silinder dipotong tegak lurus terhadap sumbunya, bentuk potongannya adalah...', o: ['Persegi', 'Lingkaran', 'Segitiga', 'Oval'], a: 1 },
  { sec: 'Spasial', q: 'Dari atas, sebuah kerucut akan terlihat berbentuk...', o: ['Segitiga', 'Lingkaran', 'Persegi', 'Oval'], a: 1 },
  { sec: 'Spasial', q: 'Jika dua persegi digabung berdampingan pada satu sisi, bentuk gabungannya adalah...', o: ['Persegi lebih besar', 'Persegi panjang', 'Segitiga', 'Trapesium'], a: 1 },
  { sec: 'Spasial', q: 'Berapa banyak sisi pada sebuah prisma segitiga?', o: ['3', '4', '5', '6'], a: 2 },
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

// Nama & arti singkat tiap dimensi DISC — dipakai di tampilan hasil.
export const DISC_DIMENSION_INFO: Record<'D' | 'I' | 'S' | 'C', { name: string; desc: string }> = {
  D: { name: 'Dominance', desc: 'Tegas, berorientasi hasil, suka tantangan & cepat ambil keputusan.' },
  I: { name: 'Influence', desc: 'Komunikatif, persuasif, antusias & mudah membangun relasi.' },
  S: { name: 'Steadiness', desc: 'Sabar, stabil, setia, kooperatif & nyaman dengan rutinitas.' },
  C: { name: 'Compliance', desc: 'Teliti, analitis, taat prosedur & mengutamakan akurasi.' },
}

// --- Interpretasi hasil Tes IQ (sisi HR) ---
// Rentang klasifikasi perkiraan IQ, urut dari tertinggi. Dipakai lib/iq-scoring.ts classifyIq().
export const IQ_CLASSIFICATIONS: { min: number; label: string; desc: string }[] = [
  { min: 130, label: 'Sangat Superior', desc: 'Kemampuan penalaran sangat tinggi di semua bagian. Cepat menangkap pola kompleks, belajar mandiri, dan nyaman dengan masalah abstrak.' },
  { min: 120, label: 'Superior', desc: 'Kemampuan kognitif jauh di atas rata-rata. Mampu menganalisis masalah baru dengan cepat dan menarik kesimpulan yang tepat.' },
  { min: 110, label: 'Di Atas Rata-rata', desc: 'Daya nalar baik dan konsisten. Mudah memahami instruksi, cukup cepat beradaptasi dengan tugas yang menuntut analisis.' },
  { min: 90, label: 'Rata-rata', desc: 'Kemampuan kognitif sesuai populasi umum. Mampu menyelesaikan tugas rutin dan analitis sederhana dengan baik.' },
  { min: 80, label: 'Di Bawah Rata-rata', desc: 'Memerlukan waktu lebih untuk memahami pola dan konsep baru. Lebih efektif dengan instruksi yang jelas dan terstruktur.' },
  { min: 0, label: 'Borderline', desc: 'Hasil tes menunjukkan kesulitan pada sebagian besar bagian. Perlu dicek ulang kondisi saat tes (waktu, fokus) sebelum disimpulkan.' },
]

// Nama, arti, dan kalimat sifat tiap bagian Tes IQ — dipakai kartu interpretasi.
export const IQ_SECTION_INFO: Record<IqCategory, { name: string; desc: string; strong: string; weak: string }> = {
  Logika: {
    name: 'Logika',
    desc: 'Penalaran deduktif, pola, dan hubungan sebab-akibat.',
    strong: 'Berpikir runtut dan sistematis; cepat menemukan pola serta inkonsistensi dalam informasi.',
    weak: 'Cenderung mengambil kesimpulan terlalu cepat; perlu latihan memecah masalah menjadi langkah-langkah kecil.',
  },
  Numerik: {
    name: 'Numerik',
    desc: 'Hitungan, deret angka, dan hubungan kuantitatif.',
    strong: 'Nyaman bekerja dengan angka, target, dan data; cocok untuk tugas yang butuh ketelitian kuantitatif.',
    weak: 'Kurang nyaman dengan angka dan hitungan; perlu alat bantu atau pengecekan ganda untuk tugas numerik.',
  },
  Verbal: {
    name: 'Verbal',
    desc: 'Kosakata, analogi kata, dan pemahaman bahasa.',
    strong: 'Memahami dan menyampaikan ide dengan jelas; kuat dalam komunikasi tulis maupun lisan.',
    weak: 'Perlu waktu lebih memahami instruksi tertulis yang panjang; lebih efektif dengan contoh konkret.',
  },
  Spasial: {
    name: 'Spasial',
    desc: 'Visualisasi bentuk, rotasi, dan hubungan ruang.',
    strong: 'Mudah membayangkan bentuk dan tata letak; cocok untuk desain, visual, dan pekerjaan teknis.',
    weak: 'Kurang kuat memvisualisasikan objek; tugas visual sebaiknya didukung sketsa atau referensi.',
  },
}

export const IQ_DISCLAIMER =
  'Angka IQ di atas adalah perkiraan dari tes singkat 60 soal (skala linear 70–130), bukan hasil asesmen psikolog bersertifikat. Gunakan sebagai salah satu bahan pertimbangan, bukan penentu tunggal.'
