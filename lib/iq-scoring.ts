import { IQ_CLASSIFICATIONS } from '@/lib/constants'
import type { IqCategory, IqQuestion, IqResult, IqSectionScore } from '@/lib/types'

export const IQ_CATEGORIES: IqCategory[] = ['Logika', 'Numerik', 'Verbal', 'Spasial']

export type IqCalc = Pick<IqResult, 'correct' | 'total' | 'percent' | 'category'> & { sections: Record<IqCategory, IqSectionScore> }

const pct = (c: number, t: number) => (t ? Math.round((c / t) * 100) : 0)

/** Hitung skor IQ (total + per bagian) dari jawaban & bank soal. Deterministik. */
export function calcIq(answers: Record<number, number>, questions: IqQuestion[]): IqCalc {
  const sections = Object.fromEntries(
    IQ_CATEGORIES.map(c => [c, { correct: 0, total: 0, percent: 0 }])
  ) as Record<IqCategory, IqSectionScore>

  let correct = 0
  questions.forEach((q, i) => {
    const sec = sections[q.sec] ?? (sections[q.sec] = { correct: 0, total: 0, percent: 0 })
    sec.total++
    if (Number(answers[i]) === q.a) { correct++; sec.correct++ }
  })
  for (const c of Object.keys(sections) as IqCategory[]) {
    sections[c].percent = pct(sections[c].correct, sections[c].total)
  }

  const total = questions.length
  const percent = pct(correct, total)
  const category: IqResult['category'] = percent >= 80 ? 'Tinggi' : percent >= 50 ? 'Rata-rata' : 'Perlu Perhatian'
  return { correct, total, percent, category, sections }
}

/** Perkiraan IQ linear: 0% → 70, 50% → 100, 100% → 130. */
export const estimateIq = (percent: number) => Math.round(70 + percent * 0.6)

export const classifyIq = (score: number) =>
  IQ_CLASSIFICATIONS.find(c => score >= c.min) ?? IQ_CLASSIFICATIONS[IQ_CLASSIFICATIONS.length - 1]

export type IqSectionLevel = 'kuat' | 'cukup' | 'lemah'
export const sectionLevel = (percent: number): IqSectionLevel =>
  percent >= 80 ? 'kuat' : percent >= 50 ? 'cukup' : 'lemah'
