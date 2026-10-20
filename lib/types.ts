export type UserRole = 'hr' | 'candidate' | 'dev'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface PositionWeight {
  exp: number
  skill: number
  portfolio: number
  achiev: number
  edu: number
  stability: number
  fit: number
  salary: number
  cvquality: number
  soft: number
}

export interface Position {
  id: string
  name: string
  weights: PositionWeight
}

export type CandidateStage =
  | 'screening'
  | 'psikotes'
  | 'interview'
  | 'offer'
  | 'onboarding'
  | 'hired'
  | 'rejected'

export interface Candidate {
  id: string
  user_id: string | null
  nama: string
  posisi: string
  sumber: string
  email: string
  telepon: string
  catatan: string
  stage: CandidateStage
  tanggal: string
  invite_token: string | null
  cv: CvAssessment | null
  // Arsip hasil psikotes lama (cog/trait/sjt) — dipertahankan read-only, tidak dipakai di UI baru.
  psikotes: PsikotesResult | null
  psikotes_open_at: string | null
  psikotes_close_at: string | null
  psikotes_time_limit: number | null
  // Hasil tes DISC & IQ (modul baru) — dua sesi independen.
  psikotes_result: PsikotesResultV2 | null
  disc_open_at: string | null
  disc_close_at: string | null
  disc_time_limit: number | null
  disc_started_at: string | null
  iq_open_at: string | null
  iq_close_at: string | null
  iq_time_limit: number | null
  iq_started_at: string | null
  interview: InterviewAssessment | null
  onboarding: OnboardingProgress | null
}

export interface CvScores {
  [key: string]: number
}

export interface CvAssessment {
  scores: CvScores
  got: number
  max: number
  percent: number
  verdict: string
  filled: number
  notes: string
  date: string
}

export interface PsikotesResult {
  cog: Record<number, number>
  trait: Record<number, number>
  sjt: Record<number, number>
  cogTotal: number
  sjtTotal: number
  traits: Record<string, number>
  date: string
  via?: string
  candidateId?: string | null
}

export interface IntScores {
  [key: string]: number
}

export interface InterviewAssessment {
  scores: IntScores
  avg: number
  verdict: string
  filled: number
  by: string
  rec: string
  notes: string
  date: string
}

export interface OnboardingProgress {
  checklist: Record<string, boolean>
  progress: number
  date: string
}

export interface CvCriterion {
  id: string
  name: string
  desc: string
}

export interface PsiCogQuestion {
  sec: string
  q: string
  o: string[]
  a: number
}

export interface PsiTraitQuestion {
  t: string
  q: string
}

export interface PsiSjtQuestion {
  q: string
  o: [string, number][]
}

// --- Tes DISC (forced-choice Most/Least, 4 pilihan teks per soal) ---
export type DiscDimension = 'D' | 'I' | 'S' | 'C' | 'X'
export type DiscLetter = 'a' | 'b' | 'c' | 'd'

export interface DiscQuestion {
  no: number
  options: Record<DiscLetter, string>
}

// Pemetaan huruf pilihan -> dimensi DISC, berbeda untuk kolom Most dan Least
// (satu kata sifat bisa mewakili dimensi berbeda tergantung dipilih sebagai Most atau Least).
export interface DiscQuestionMapping {
  [questionNo: number]: Record<DiscLetter, DiscDimension>
}

// Tabel konversi raw count (jumlah dimensi terpilih) -> skor persentil 0-100.
export type DiscConversionTable = Record<'D' | 'I' | 'S' | 'C', Record<number, number>>

export interface DiscBehavioralPattern {
  name: string
  type: 'D' | 'I' | 'S' | 'C'
}

// Peta kode graph (8 huruf: H/L + D/I/S/C diurutkan skor tertinggi->terendah) -> nama pola.
export type DiscBehavioralGraphMap = Record<string, DiscBehavioralPattern>

export interface DiscProfileTendencies {
  goal: string
  judges: string
  influence: string
  valueTo: string
  overuses: string
  underStress: string
  fears: string
}

export interface DiscProfileDescription {
  keyStrengths: string[]
  improveBy: string[]
  tendencies: DiscProfileTendencies
}

export type DiscProfileDescriptionMap = Record<string, DiscProfileDescription>

export interface DiscAnswer {
  most: DiscLetter
  least: DiscLetter
}

export interface DiscGraphResult {
  scores: Record<'D' | 'I' | 'S' | 'C', number>
  pattern: DiscBehavioralPattern
}

export interface DiscResult {
  answers: Record<number, DiscAnswer>
  adapted: DiscGraphResult // dihitung dari kolom "Most" — gaya adaptasi di lingkungan kerja
  natural: DiscGraphResult // dihitung dari kolom "Least" — gaya alami/dasar
  date: string
  via: 'kandidat' | 'hr'
}

// --- Tes IQ ---
export type IqCategory = 'Logika' | 'Numerik' | 'Verbal' | 'Spasial'

export interface IqQuestion {
  sec: IqCategory
  q: string
  o: string[]
  a: number
}

export type IqResultCategory = 'Tinggi' | 'Rata-rata' | 'Perlu Perhatian'

export interface IqSectionScore {
  correct: number
  total: number
  percent: number
}

export interface IqResult {
  answers: Record<number, number>
  correct: number
  total: number
  percent: number
  category: IqResultCategory
  /** Skor per bagian — opsional karena hasil lama di DB belum menyimpannya. */
  sections?: Record<IqCategory, IqSectionScore>
  date: string
  via: 'kandidat' | 'hr'
}

export interface PsikotesResultV2 {
  disc: DiscResult | null
  iq: IqResult | null
}

export interface IntCompetency {
  id: string
  name: string
  desc: string
}

export interface OnboardingGroup {
  g: string
  items: string[]
}

export interface PositionDefault {
  id: string
  name: string
  weights: PositionWeight
}
