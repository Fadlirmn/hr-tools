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
  psikotes: PsikotesResult | null
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
