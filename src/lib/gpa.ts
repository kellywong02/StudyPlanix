import type { GradingScale } from "@/lib/grading-scales"

export type GradedCourse = {
  id: string
  name: string
  term: string | null
  credits: number | null
  grade: string | null
}

export type TermGpa = {
  term: string
  credits: number
  gpa: number | null
  /** cumulative GPA through the end of this term (running total, in term order) */
  cumulativeGpaThroughTerm: number | null
}

export type GpaSummary = {
  cumulativeGpa: number | null
  totalCredits: number
  terms: TermGpa[]
}

export function pointsForGrade(scale: GradingScale, grade: string): number | null {
  return scale.grades.find((g) => g.grade === grade)?.points ?? null
}

export function computeGpaSummary(courses: GradedCourse[], scale: GradingScale): GpaSummary {
  // only courses with both a grade and credit value count toward GPA
  const graded = courses.filter(
    (c) => c.grade && c.credits !== null && c.credits > 0 && pointsForGrade(scale, c.grade) !== null
  )

  const byTerm = new Map<string, GradedCourse[]>()
  for (const c of graded) {
    const term = c.term?.trim() || "No term"
    const list = byTerm.get(term) ?? []
    list.push(c)
    byTerm.set(term, list)
  }

  // terms are visited in the order their first graded course appears, which
  // follows course creation order (courses are fetched oldest-first) — a
  // reasonable proxy for chronological progress since free-text term names
  // (e.g. "Fall 2026") can't be reliably parsed for real dates
  let runningCredits = 0
  let runningQualityPoints = 0
  const terms: TermGpa[] = Array.from(byTerm.entries()).map(([term, list]) => {
    const credits = list.reduce((sum, c) => sum + (c.credits ?? 0), 0)
    const qualityPoints = list.reduce(
      (sum, c) => sum + (pointsForGrade(scale, c.grade!) ?? 0) * (c.credits ?? 0),
      0
    )
    runningCredits += credits
    runningQualityPoints += qualityPoints
    return {
      term,
      credits,
      gpa: credits > 0 ? qualityPoints / credits : null,
      cumulativeGpaThroughTerm: runningCredits > 0 ? runningQualityPoints / runningCredits : null,
    }
  })

  const totalCredits = graded.reduce((sum, c) => sum + (c.credits ?? 0), 0)
  const totalQualityPoints = graded.reduce(
    (sum, c) => sum + (pointsForGrade(scale, c.grade!) ?? 0) * (c.credits ?? 0),
    0
  )

  return {
    cumulativeGpa: totalCredits > 0 ? totalQualityPoints / totalCredits : null,
    totalCredits,
    terms,
  }
}
